import type { Product } from "./types";

export function selectCategoryDiverseProducts(
  products: Product[],
  options: {
    limit: number;
    maxPerCategory: number;
    excludeIds?: ReadonlySet<string>;
  },
): Product[] {
  const { limit, maxPerCategory, excludeIds } = options;
  const categoryCounts = new Map<string, number>();
  const selected: Product[] = [];

  for (const product of products) {
    if (excludeIds?.has(product.id)) continue;
    const count = categoryCounts.get(product.categorySlug) ?? 0;
    if (count >= maxPerCategory) continue;

    categoryCounts.set(product.categorySlug, count + 1);
    selected.push(product);
    if (selected.length >= limit) break;
  }

  return selected;
}
