import type { ProductSurface } from "./product-metrics";

const EARLY_PRODUCT_GRID_SURFACES = new Set<ProductSurface>([
  "category",
  "search",
  "popular",
  "recommended",
  "deals",
]);

export type ProductCardImageLoading = {
  loading: "eager" | "lazy";
  fetchPriority: "high" | "auto";
};

/**
 * 商品一覧がページの主内容になる画面だけ、先頭2画像を早く取得する。
 * TOP・特集・産地・関連記事では先行コンテンツと帯域を競わせない。
 */
export function productCardImageLoading(
  surface: ProductSurface,
  index: number,
): ProductCardImageLoading {
  const isEarlyGridImage =
    index >= 0 &&
    index < 2 &&
    EARLY_PRODUCT_GRID_SURFACES.has(surface);

  return isEarlyGridImage
    ? { loading: "eager", fetchPriority: "high" }
    : { loading: "lazy", fetchPriority: "auto" };
}
