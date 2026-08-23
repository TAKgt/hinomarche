import { displayProductTitle } from "./product-title";
import type { Product } from "./types";

export const PRODUCT_META_TITLE_MAX_LENGTH = 60;
export const PRODUCT_META_TITLE_SUFFIX = " | ヒノマルシェ";
export const PRODUCT_META_DESCRIPTION_MAX_LENGTH = 150;
export const PRODUCT_MERCHANT_DESCRIPTION_MAX_LENGTH = 600;

const PRODUCT_META_TITLE_CONTENT_MAX_LENGTH =
  PRODUCT_META_TITLE_MAX_LENGTH - PRODUCT_META_TITLE_SUFFIX.length - 1;

function normalizeMetadataText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateJapaneseSummary(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const limit = Math.max(20, maxLength - 1);
  const candidate = value.slice(0, limit);
  const preferredMinimum = Math.floor(limit * 0.75);
  const sentenceBreak = candidate.lastIndexOf("。");
  if (sentenceBreak >= preferredMinimum) {
    return candidate.slice(0, sentenceBreak + 1);
  }

  const phraseBreak = Math.max(
    candidate.lastIndexOf("、"),
    candidate.lastIndexOf(" "),
  );
  const end = phraseBreak >= preferredMinimum ? phraseBreak : limit;
  return `${candidate.slice(0, end).trim()}…`;
}

function truncateJapaneseExcerpt(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const limit = Math.max(20, maxLength - 1);
  const candidate = value.slice(0, limit);
  const preferredMinimum = Math.floor(limit * 0.7);
  const sentenceBreak = candidate.lastIndexOf("。");
  const phraseBreak = Math.max(
    candidate.lastIndexOf("、"),
    candidate.lastIndexOf(" "),
  );
  const end =
    sentenceBreak >= preferredMinimum
      ? sentenceBreak + 1
      : phraseBreak >= preferredMinimum
        ? phraseBreak
        : limit;
  return `${candidate.slice(0, end).trim()}…`;
}

/**
 * root layoutのtitle templateを含めて60文字以内になる商品titleを作る。
 * 商品名の先頭だけを使い、新しいブランド名や訴求文は補わない。
 */
export function buildProductMetaTitle(
  product: Pick<Product, "title">,
): string {
  return displayProductTitle(product.title, PRODUCT_META_TITLE_CONTENT_MAX_LENGTH);
}

/** Next.jsのroot title template適用後と同じ形を監査する。 */
export function buildRenderedProductMetaTitle(
  product: Pick<Product, "title">,
): string {
  return `${buildProductMetaTitle(product)}${PRODUCT_META_TITLE_SUFFIX}`;
}

export function rawProductMetaDescription(product: Product): string {
  const title = displayProductTitle(product.title, 56);
  const evidence = normalizeMetadataText(product.evidenceText);
  return `${title}。AI日本度${product.score}%（AI推定）。${evidence}`;
}

/**
 * 画面に表示している商品名・AI日本度・判定根拠だけで検索結果向け要約を作る。
 * 新しい事実や販売条件は補わず、長い販売元文言をそのままmetaへ流さない。
 */
export function buildProductMetaDescription(product: Product): string {
  return truncateJapaneseSummary(
    rawProductMetaDescription(product),
    PRODUCT_META_DESCRIPTION_MAX_LENGTH,
  );
}

/**
 * 販売元由来の長文を商品ページの補足情報として読みやすい長さへ限定する。
 * 元文の先頭だけを使い、事実の言い換えや追加は行わない。
 */
export function buildProductMerchantDescriptionExcerpt(
  description: string | null | undefined,
): string | null {
  if (!description) return null;
  const normalized = normalizeMetadataText(description);
  if (!normalized) return null;
  return truncateJapaneseExcerpt(
    normalized,
    PRODUCT_MERCHANT_DESCRIPTION_MAX_LENGTH,
  );
}

type DuplicateSummary = {
  groups: number;
  rows: number;
};

function summarizeDuplicates(values: readonly string[]): DuplicateSummary {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const duplicates = [...counts.values()].filter((count) => count > 1);
  return {
    groups: duplicates.length,
    rows: duplicates.reduce((total, count) => total + count, 0),
  };
}

export type ProductMetadataQualitySummary = {
  products: number;
  title: {
    duplicateGroups: number;
    duplicateRows: number;
    over60Characters: number;
  };
  description: {
    duplicateGroups: number;
    duplicateRows: number;
    over120Characters: number;
    over160Characters: number;
    shortenedToTarget: number;
    maximumCharacters: number;
  };
  merchantDescription: {
    withSourceText: number;
    shortenedToTarget: number;
    overTargetAfterFormatting: number;
    maximumCharacters: number;
  };
};

/** 個別の商品名・URL・IDを返さない、検索表示品質の読み取り集計。 */
export function summarizeProductMetadataQuality(
  products: readonly Product[],
): ProductMetadataQualitySummary {
  const titles = products.map(buildRenderedProductMetaTitle);
  const descriptions = products.map(buildProductMetaDescription);
  const rawDescriptions = products.map(rawProductMetaDescription);
  const rawMerchantDescriptions = products.map((product) => {
    if (!product.description) return null;
    return normalizeMetadataText(product.description) || null;
  });
  const merchantDescriptions = products.map((product) =>
    buildProductMerchantDescriptionExcerpt(product.description),
  );
  const titleDuplicates = summarizeDuplicates(titles);
  const descriptionDuplicates = summarizeDuplicates(descriptions);

  return {
    products: products.length,
    title: {
      duplicateGroups: titleDuplicates.groups,
      duplicateRows: titleDuplicates.rows,
      over60Characters: titles.filter((title) => title.length > 60).length,
    },
    description: {
      duplicateGroups: descriptionDuplicates.groups,
      duplicateRows: descriptionDuplicates.rows,
      over120Characters: descriptions.filter(
        (description) => description.length > 120,
      ).length,
      over160Characters: descriptions.filter(
        (description) => description.length > 160,
      ).length,
      shortenedToTarget: rawDescriptions.filter(
        (description, index) => description !== descriptions[index],
      ).length,
      maximumCharacters: descriptions.reduce(
        (maximum, description) => Math.max(maximum, description.length),
        0,
      ),
    },
    merchantDescription: {
      withSourceText: rawMerchantDescriptions.filter(Boolean).length,
      shortenedToTarget: rawMerchantDescriptions.filter(
        (description, index) =>
          description !== null && description !== merchantDescriptions[index],
      ).length,
      overTargetAfterFormatting: merchantDescriptions.filter(
        (description) =>
          description !== null &&
          description.length > PRODUCT_MERCHANT_DESCRIPTION_MAX_LENGTH,
      ).length,
      maximumCharacters: merchantDescriptions.reduce(
        (maximum, description) =>
          Math.max(maximum, description?.length ?? 0),
        0,
      ),
    },
  };
}
