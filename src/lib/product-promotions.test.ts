import assert from "node:assert/strict";
import test from "node:test";
import {
  activePromotions,
  hasFreshPromotionData,
  promotionLabels,
} from "./product-promotions";
import type { Product } from "./types";

const now = new Date("2026-07-26T03:00:00.000Z");

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    source: "rakuten",
    sourceItemId: "shop:item",
    title: "商品",
    description: null,
    maker: null,
    brand: null,
    imageUrl: null,
    price: 1000,
    fetchedAt: now.toISOString(),
    contentUpdatedAt: now.toISOString(),
    priceUpdatedAt: now.toISOString(),
    affiliateUrl: "https://example.com",
    categorySlug: "kitchen",
    reviewCount: null,
    reviewAverage: null,
    affiliateRate: null,
    postageIncluded: true,
    saleStartAt: "2026-07-25T00:00:00.000Z",
    saleEndAt: "2026-07-27T00:00:00.000Z",
    pointRate: 5,
    pointRateStartAt: "2026-07-25T00:00:00.000Z",
    pointRateEndAt: "2026-07-28T00:00:00.000Z",
    promotionFetchedAt: "2026-07-26T02:00:00.000Z",
    searchRank: 1,
    demandScore: 50,
    featuredScore: 70,
    score: 80,
    tier: "high",
    evidenceType: "推定",
    evidenceText: "商品情報をもとにした推定",
    judgedAt: now.toISOString(),
    checks: null,
    ...overrides,
  };
}

test("取得から48時間以内かつ期間内の販促条件だけを有効にする", () => {
  const target = product();

  assert.equal(hasFreshPromotionData(target, now), true);
  assert.deepEqual(activePromotions(target, now), {
    sale: true,
    postage: true,
    points: true,
  });
  assert.deepEqual(promotionLabels(target, now), [
    "期間限定セール",
    "送料無料対象",
    "ポイント5倍",
  ]);
});

test("終了日時を過ぎたセールとポイントアップは表示しない", () => {
  const target = product({
    saleEndAt: "2026-07-26T02:59:59.000Z",
    pointRateEndAt: "2026-07-26T02:59:59.000Z",
  });

  assert.deepEqual(activePromotions(target, now), {
    sale: false,
    postage: true,
    points: false,
  });
});
test("取得から48時間を超えた情報はすべて表示しない", () => {
  const target = product({
    promotionFetchedAt: "2026-07-24T02:59:59.000Z",
  });

  assert.equal(hasFreshPromotionData(target, now), false);
  assert.deepEqual(activePromotions(target, now), {
    sale: false,
    postage: false,
    points: false,
  });
});
