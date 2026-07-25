import { createHash } from "node:crypto";
import type { Judgment, RawProduct } from "./types";

const JUDGMENT_INPUT_VERSION = "v1";

export type JudgmentConsistencyIssue =
  | "year_not_in_source"
  | "number_not_in_source"
  | "manufacturing_origin_conflict"
  | "conflicting_consecutive_year_claim"
  | "conflicting_source_claim";

export interface ProductFreshnessSnapshot {
  source: RawProduct["source"];
  title: string;
  description: string | null;
  maker: string | null;
  brand: string | null;
  judgmentInputHash: string | null;
  contentUpdatedAt: string | null;
  createdAt: string;
  isPublished: boolean;
  judgmentStatus: "pending" | "current" | "blocked";
}

export interface ProductRefreshPlan {
  judgmentInputHash: string;
  inputChanged: boolean;
  contentUpdatedAt: string;
  isPublished: boolean;
  judgmentStatus: "pending" | "current" | "blocked";
}

/** 取得成功時に既存商品へ反映する、販売元由来の可変項目。 */
export function refreshedProductFields(raw: RawProduct) {
  return {
    title: raw.title,
    description: raw.description,
    maker: raw.maker,
    brand: raw.brand,
    image_url: raw.imageUrl,
    price: raw.price,
    affiliate_url: raw.affiliateUrl,
    item_url: raw.itemUrl,
    review_count: raw.reviewCount ?? null,
    review_average: raw.reviewAverage ?? null,
    affiliate_rate: raw.affiliateRate ?? null,
    search_rank: raw.searchRank ?? null,
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * AIへ実際に渡す判定材料を正規化する。
 * 表示用・価格・リンク等は判定根拠ではないためハッシュへ含めない。
 */
export function judgmentInput(raw: RawProduct) {
  return {
    version: JUDGMENT_INPUT_VERSION,
    source: raw.source,
    title: normalizeText(raw.title),
    brand: normalizeText(raw.brand),
    maker: normalizeText(raw.maker),
    description: normalizeText(raw.description).slice(0, 3000),
  };
}

export function judgmentInputHash(raw: RawProduct): string {
  return createHash("sha256")
    .update(JSON.stringify(judgmentInput(raw)), "utf8")
    .digest("hex");
}

export function formatJudgmentInput(raw: RawProduct): string {
  const input = judgmentInput(raw);
  return [
    `商品名: ${input.title}`,
    input.brand ? `ブランド: ${input.brand}` : null,
    input.maker ? `メーカー: ${input.maker}` : null,
    `販売元: ${input.source === "rakuten" ? "楽天市場" : "Amazon"}`,
    `商品説明:\n${input.description || "(説明文なし)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function snapshotAsRaw(snapshot: ProductFreshnessSnapshot): RawProduct {
  return {
    source: snapshot.source,
    sourceItemId: "",
    title: snapshot.title,
    description: snapshot.description,
    maker: snapshot.maker,
    brand: snapshot.brand,
    imageUrl: null,
    price: null,
    affiliateUrl: "",
    itemUrl: "",
    categorySlug: "",
  };
}

/**
 * 同じ取得内容では公開状態と内容更新日時を維持する。
 * 判定材料が変わった場合だけ旧判定を無効化し、再判定待ちへ戻す。
 */
export function planProductRefresh(
  snapshot: ProductFreshnessSnapshot,
  raw: RawProduct,
  fetchedAt: string,
): ProductRefreshPlan {
  const currentHash =
    snapshot.judgmentInputHash ?? judgmentInputHash(snapshotAsRaw(snapshot));
  const nextHash = judgmentInputHash(raw);
  const inputChanged = currentHash !== nextHash;

  return {
    judgmentInputHash: nextHash,
    inputChanged,
    contentUpdatedAt: inputChanged
      ? fetchedAt
      : (snapshot.contentUpdatedAt ?? snapshot.createdAt),
    isPublished: inputChanged ? false : snapshot.isPublished,
    judgmentStatus: inputChanged ? "pending" : snapshot.judgmentStatus,
  };
}

function normalizedSourceText(raw: RawProduct): string {
  return normalizeText(
    [raw.title, raw.description, raw.brand, raw.maker]
      .filter(Boolean)
      .join("\n"),
  );
}

function numericClaims(text: string): string[] {
  const normalized = normalizeText(text);
  return [
    ...normalized.matchAll(
      /(?:19|20)\d{2}年|(?:\d+(?:\.\d+)?)\s*(?:年|%|mm|cm|mg|kg|ml|m|g|l|円|個|本|枚|回|段|層|号)/gi,
    ),
  ].map((match) => match[0].replace(/\s+/g, "").toLowerCase());
}

const JAPAN_MANUFACTURING =
  /(?:生産国|原産国|製造国|製造地)\s*[:：]?\s*(?:日本|日本国)|(?:^|[\s、。,【(])(?:日本製|国内製造)(?:$|[\s、。】)])/;
const FOREIGN_MANUFACTURING =
  /(?:生産国|原産国|製造国|製造地)\s*[:：]?\s*(?:中国|中華人民共和国|ベトナム|韓国|台湾|タイ|インド|インドネシア|マレーシア|フィリピン|米国|アメリカ|ドイツ|フランス|イタリア)|(?:中国|ベトナム|韓国|台湾|タイ|インド|インドネシア|マレーシア|フィリピン|米国|アメリカ|ドイツ|フランス|イタリア)製/;

function distinctMatches(text: string, pattern: RegExp): Set<string> {
  return new Set(
    [...text.matchAll(pattern)].map((match) =>
      normalizeText(match[1]).replace(/\s+/g, "").toLowerCase(),
    ),
  );
}

/**
 * AIの出力に依存せず、販売元の商品名・説明内だけで競合している主張を検出する。
 * 単なる数字の複数出現は対象にせず、意味が固定されたラベルまたは「特Aの連続年数」に限定する。
 */
export function detectSourceConsistencyIssues(
  raw: RawProduct,
): JudgmentConsistencyIssue[] {
  const sourceText = normalizedSourceText(raw);
  const issues = new Set<JudgmentConsistencyIssue>();
  const sourceSaysJapan = JAPAN_MANUFACTURING.test(sourceText);
  const sourceSaysForeign = FOREIGN_MANUFACTURING.test(sourceText);

  if (sourceSaysJapan && sourceSaysForeign) {
    issues.add("manufacturing_origin_conflict");
  }

  // 「特A」が商品情報内にある場合だけ連続年数を比較する。
  // 価格・内容量・寸法などの無関係な数字はここへ入らない。
  if (/特\s*[AaＡａ]/i.test(sourceText)) {
    const consecutiveYears = distinctMatches(
      sourceText,
      /(\d{1,3})\s*年\s*連続/g,
    );
    if (consecutiveYears.size > 1) {
      issues.add("conflicting_consecutive_year_claim");
    }
  }

  const fixedContextClaims = [
    // 同じ明示ラベルに異なる値が併記された場合だけ競合とする。
    /(?:認定番号|認証番号|登録番号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9-]{2,})/g,
    /(?:モデル年|製造年)\s*[:：]?\s*((?:19|20)\d{2})\s*年?/g,
    /(?:内容量|正味量)\s*[:：]\s*(\d+(?:\.\d+)?\s*(?:mg|kg|ml|g|l))/gi,
    /(?:枚数|入数)\s*[:：]\s*(\d+(?:\.\d+)?\s*(?:枚|個|本))/g,
    /(?:寸法|サイズ)\s*[:：]\s*(\d+(?:\.\d+)?\s*(?:(?:mm|cm|m)\s*)?[×xX]\s*\d+(?:\.\d+)?\s*(?:mm|cm|m))/gi,
  ];
  for (const pattern of fixedContextClaims) {
    if (distinctMatches(sourceText, pattern).size > 1) {
      issues.add("conflicting_source_claim");
      break;
    }
  }

  return [...issues];
}

/**
 * 公開前の決定的な整合性検査。
 * 元情報内の競合、AI根拠にだけ現れる年・単位付き数値、
 * または製造地の正反対の主張を保留対象にする。
 */
export function detectJudgmentConsistencyIssues(
  raw: RawProduct,
  judgment: Judgment,
): JudgmentConsistencyIssue[] {
  const sourceText = normalizedSourceText(raw);
  const evidenceText = normalizeText(judgment.evidenceText);
  const sourceNumericClaims = new Set(numericClaims(sourceText));
  const issues = new Set<JudgmentConsistencyIssue>(
    detectSourceConsistencyIssues(raw),
  );

  for (const claim of numericClaims(evidenceText)) {
    if (sourceNumericClaims.has(claim)) continue;
    if (/^(?:19|20)\d{2}年$/.test(claim)) {
      issues.add("year_not_in_source");
    } else {
      issues.add("number_not_in_source");
    }
  }

  const sourceSaysJapan = JAPAN_MANUFACTURING.test(sourceText);
  const sourceSaysForeign = FOREIGN_MANUFACTURING.test(sourceText);
  const evidenceSaysJapan = JAPAN_MANUFACTURING.test(evidenceText);
  const evidenceSaysForeign = FOREIGN_MANUFACTURING.test(evidenceText);

  if (
    (sourceSaysForeign && (judgment.checks.origin === "yes" || evidenceSaysJapan)) ||
    (sourceSaysJapan && (judgment.checks.origin === "no" || evidenceSaysForeign))
  ) {
    issues.add("manufacturing_origin_conflict");
  }

  return [...issues];
}
