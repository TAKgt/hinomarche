import { assessProductIndexQuality } from "./product-index-quality";
import type { ProductPageData } from "./types";

export type EditorialPriorityThemeId =
  | "tsubame_kitchen"
  | "rice_cookers"
  | "imabari_furusato"
  | "japanese_tea";

export interface EditorialPriorityTheme {
  id: EditorialPriorityThemeId;
  label: string;
  verificationGoal: string;
}

export interface EditorialPriorityCandidate {
  theme: EditorialPriorityTheme;
  product: ProductPageData;
}

export interface EditorialPrioritySelection {
  candidates: EditorialPriorityCandidate[];
  selectedByTheme: Record<EditorialPriorityThemeId, number>;
  matchingEligibleByTheme: Record<EditorialPriorityThemeId, number>;
  technicalEligiblePool: number;
  informationInconsistentExcluded: number;
  targetPerTheme: number;
}

export const EDITORIAL_PRIORITY_THEMES: readonly EditorialPriorityTheme[] = [
  {
    id: "tsubame_kitchen",
    label: "燕三条・キッチン用品",
    verificationGoal: "地域表記、メーカー、製造地、寸法・用途を一次情報で確認する",
  },
  {
    id: "rice_cookers",
    label: "炊飯器・日本製表記",
    verificationGoal: "メーカーと型番を特定し、生産国表記の有無を一次情報で確認する",
  },
  {
    id: "imabari_furusato",
    label: "今治タオル・ふるさと納税",
    verificationGoal: "認定・産地・返礼品の主体を公式情報で確認する",
  },
  {
    id: "japanese_tea",
    label: "日本茶・緑茶",
    verificationGoal: "茶種、産地、製造者・販売者の記載を一次情報で確認する",
  },
] as const;

function normalizedTitle(product: ProductPageData): string {
  return product.title.normalize("NFKC").toLocaleLowerCase("ja");
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function matchesTheme(
  product: ProductPageData,
  themeId: EditorialPriorityThemeId,
): boolean {
  // 販売元のdescriptionには店舗内の別商品名が混ざることがあるため、
  // テーマ一致には現在の商品名だけを使う。
  const text = normalizedTitle(product);
  switch (themeId) {
    case "tsubame_kitchen":
      return (
        includesAny(text, ["燕三条", "燕市", "三条市"]) &&
        (includesAny(text, [
          "キッチン",
          "包丁",
          "ナイフ",
          "水切り",
          "調理",
          "カトラリー",
          "鍋",
          "フライパン",
          "まな板",
          "ピーラー",
          "ボウル",
          "ざる",
          "ラック",
          "おろし",
        ]) || ["kitchen", "tableware"].includes(product.categorySlug))
      );
    case "rice_cookers":
      return includesAny(text, ["炊飯器", "炊飯ジャー", "rice cooker"]);
    case "imabari_furusato":
      return text.includes("今治") && includesAny(text, ["タオル", "ふるさと納税", "返礼品"]);
    case "japanese_tea":
      return includesAny(text, ["日本茶", "緑茶", "煎茶", "玉露", "抹茶", "ほうじ茶"]);
  }
}

function evidenceRank(product: ProductPageData): number {
  switch (product.evidenceType) {
    case "産地表記":
      return 4;
    case "生産国表記":
      return 3;
    case "日本メーカー":
      return 2;
    case "推定":
      return 1;
    default:
      return 0;
  }
}

function compareCandidates(left: ProductPageData, right: ProductPageData): number {
  const evidenceDifference = evidenceRank(right) - evidenceRank(left);
  if (evidenceDifference !== 0) return evidenceDifference;
  const reviewDifference = (right.reviewCount ?? 0) - (left.reviewCount ?? 0);
  if (reviewDifference !== 0) return reviewDifference;
  const scoreDifference = (right.score ?? 0) - (left.score ?? 0);
  if (scoreDifference !== 0) return scoreDifference;
  const featuredDifference = right.featuredScore - left.featuredScore;
  if (featuredDifference !== 0) return featuredDifference;
  return left.id.localeCompare(right.id);
}

function emptyThemeCounts(): Record<EditorialPriorityThemeId, number> {
  return {
    tsubame_kitchen: 0,
    rice_cookers: 0,
    imabari_furusato: 0,
    japanese_tea: 0,
  };
}

/**
 * 一次情報確認へ進める候補を選ぶ。候補であることはeditorialEligibleを意味しない。
 * 技術品質ゲートを満たさない商品、情報不整合商品、重複商品は選ばない。
 */
export function selectEditorialPriorityCandidates(
  products: readonly ProductPageData[],
  now = new Date(),
  targetPerTheme = 5,
): EditorialPrioritySelection {
  const selectedByTheme = emptyThemeCounts();
  const matchingEligibleByTheme = emptyThemeCounts();
  const eligible: ProductPageData[] = [];
  let informationInconsistentExcluded = 0;

  for (const product of products) {
    const assessment = assessProductIndexQuality(product, now);
    if (assessment.reasons.includes("information_inconsistent")) {
      informationInconsistentExcluded++;
    }
    if (assessment.technicalEligible) eligible.push(product);
  }

  const candidates: EditorialPriorityCandidate[] = [];
  const selectedProductIds = new Set<string>();
  const safeTarget = Math.max(0, Math.floor(targetPerTheme));

  for (const theme of EDITORIAL_PRIORITY_THEMES) {
    const matches = eligible
      .filter((product) => matchesTheme(product, theme.id))
      .sort(compareCandidates);
    matchingEligibleByTheme[theme.id] = matches.length;

    for (const product of matches) {
      if (selectedByTheme[theme.id] >= safeTarget) break;
      if (selectedProductIds.has(product.id)) continue;
      selectedProductIds.add(product.id);
      selectedByTheme[theme.id]++;
      candidates.push({ theme, product });
    }
  }

  return {
    candidates,
    selectedByTheme,
    matchingEligibleByTheme,
    technicalEligiblePool: eligible.length,
    informationInconsistentExcluded,
    targetPerTheme: safeTarget,
  };
}
