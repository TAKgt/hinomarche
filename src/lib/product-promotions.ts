import type { Product } from "./types";

export const PROMOTION_FRESHNESS_HOURS = 48;

export type PromotionKind = "sale" | "postage" | "points";

export type ActivePromotions = {
  sale: boolean;
  postage: boolean;
  points: boolean;
};

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isActiveWindow(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  nowMs: number,
): boolean {
  const start = timestamp(startAt);
  const end = timestamp(endAt);
  return start !== null && end !== null && start <= nowMs && end > nowMs;
}

export function hasFreshPromotionData(
  product: Pick<Product, "promotionFetchedAt">,
  now = new Date(),
): boolean {
  const fetchedAt = timestamp(product.promotionFetchedAt);
  if (fetchedAt === null) return false;
  const age = now.getTime() - fetchedAt;
  return age >= 0 && age <= PROMOTION_FRESHNESS_HOURS * 60 * 60 * 1000;
}

export function activePromotions(
  product: Pick<
    Product,
    | "promotionFetchedAt"
    | "postageIncluded"
    | "saleStartAt"
    | "saleEndAt"
    | "pointRate"
    | "pointRateStartAt"
    | "pointRateEndAt"
  >,
  now = new Date(),
): ActivePromotions {
  if (!hasFreshPromotionData(product, now)) {
    return { sale: false, postage: false, points: false };
  }

  return {
    sale: isActiveWindow(product.saleStartAt, product.saleEndAt, now.getTime()),
    postage: product.postageIncluded === true,
    points:
      product.pointRate != null &&
      product.pointRate >= 2 &&
      isActiveWindow(product.pointRateStartAt, product.pointRateEndAt, now.getTime()),
  };
}

export function hasActivePromotion(product: Product, now = new Date()): boolean {
  return Object.values(activePromotions(product, now)).some(Boolean);
}

export function promotionLabels(product: Product, now = new Date()): string[] {
  const active = activePromotions(product, now);
  const labels: string[] = [];
  if (active.sale) labels.push("期間限定セール");
  if (active.postage) labels.push("送料無料対象");
  if (active.points && product.pointRate != null) {
    labels.push(`ポイント${product.pointRate}倍`);
  }
  return labels;
}

export function productsForPromotion(
  products: Product[],
  kind: PromotionKind,
  now = new Date(),
): Product[] {
  return products.filter((product) => activePromotions(product, now)[kind]);
}
