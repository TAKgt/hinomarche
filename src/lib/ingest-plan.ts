import type { Category } from "./types";

export type CategoryInventory = {
  published: number;
  pending: number;
};

export type UnderfilledPlan = {
  categories: Category[];
  judgmentLimits: Record<string, number>;
  searchSlugs: Set<string>;
};

/**
 * 公開商品が目標未満のカテゴリを、公開数が少ない順に選ぶ。
 * 判定待ちが目標数まで揃っていれば、商品APIの再検索は不要と判断する。
 */
export function planUnderfilledCategories(
  categories: Category[],
  inventory: Record<string, CategoryInventory>,
  categoryLimit: number,
  target: number,
): UnderfilledPlan | null {
  const underfilled = categories
    .filter((category) => (inventory[category.slug]?.published ?? 0) < target)
    .sort((a, b) => {
      const aPublished = inventory[a.slug]?.published ?? 0;
      const bPublished = inventory[b.slug]?.published ?? 0;
      return aPublished - bPublished;
    });

  if (underfilled.length === 0) return null;

  const selected = underfilled.slice(0, Math.max(1, categoryLimit));
  const judgmentLimits: Record<string, number> = {};
  const searchSlugs = new Set<string>();

  for (const category of selected) {
    const counts = inventory[category.slug] ?? { published: 0, pending: 0 };
    judgmentLimits[category.slug] = Math.max(0, target - counts.published);
    if (counts.published + counts.pending < target) {
      searchSlugs.add(category.slug);
    }
  }

  return { categories: selected, judgmentLimits, searchSlugs };
}
