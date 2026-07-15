import type { Product } from "./types";

export const PRICE_FILTERS = [
  { key: "", label: "指定なし" },
  { key: "under-3000", label: "3,000円未満" },
  { key: "3000-9999", label: "3,000〜9,999円" },
  { key: "10000-29999", label: "1万〜2万9,999円" },
  { key: "30000-plus", label: "3万円以上" },
] as const;

export const REVIEW_FILTERS = [
  { key: "", label: "指定なし" },
  { key: "rating-4", label: "評価4.0以上" },
  { key: "popular-100", label: "評価4.0以上・100件以上" },
] as const;

export type PriceFilterKey = Exclude<(typeof PRICE_FILTERS)[number]["key"], "">;
export type ReviewFilterKey = Exclude<(typeof REVIEW_FILTERS)[number]["key"], "">;

export function parsePriceFilter(value: string | undefined): PriceFilterKey | undefined {
  return PRICE_FILTERS.some((filter) => filter.key !== "" && filter.key === value)
    ? (value as PriceFilterKey)
    : undefined;
}

export function parseReviewFilter(value: string | undefined): ReviewFilterKey | undefined {
  return REVIEW_FILTERS.some((filter) => filter.key !== "" && filter.key === value)
    ? (value as ReviewFilterKey)
    : undefined;
}

export function matchesShoppingFilters(
  product: Product,
  priceFilter?: PriceFilterKey,
  reviewFilter?: ReviewFilterKey,
): boolean {
  if (priceFilter) {
    if (product.price == null || product.price <= 0) return false;
    if (priceFilter === "under-3000" && product.price >= 3000) return false;
    if (priceFilter === "3000-9999" && (product.price < 3000 || product.price >= 10000)) return false;
    if (priceFilter === "10000-29999" && (product.price < 10000 || product.price >= 30000)) return false;
    if (priceFilter === "30000-plus" && product.price < 30000) return false;
  }

  if (reviewFilter) {
    if (
      product.reviewAverage == null ||
      product.reviewAverage < 4 ||
      product.reviewCount == null ||
      product.reviewCount < 1
    ) {
      return false;
    }
    if (reviewFilter === "popular-100" && product.reviewCount < 100) return false;
  }
  return true;
}
