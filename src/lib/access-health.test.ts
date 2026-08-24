import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeAccessHealth,
  type AccessFunnelSnapshot,
} from "./access-health";
import type { ProductPageData } from "./types";

const NOW = new Date("2026-08-24T00:00:00.000Z");

function product(
  id: string,
  overrides: Partial<ProductPageData> = {},
): ProductPageData {
  return {
    id,
    source: "rakuten",
    sourceItemId: `shop:${id}`,
    title: `商品 ${id}`,
    description: "商品説明",
    maker: "メーカー",
    brand: null,
    imageUrl: null,
    price: 3000,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    contentUpdatedAt: "2026-08-20T00:00:00.000Z",
    priceUpdatedAt: "2026-08-20T00:00:00.000Z",
    affiliateUrl: "https://item.rakuten.co.jp/example/item/",
    categorySlug: "kitchen",
    reviewCount: 10,
    reviewAverage: 4.5,
    affiliateRate: 1,
    searchRank: 1,
    demandScore: 10,
    featuredScore: 10,
    isPublished: true,
    judgmentStatus: "current",
    judgmentInputHash: null,
    score: 85,
    tier: "high",
    evidenceType: "日本メーカー",
    evidenceText: "販売元情報にメーカー名の記載がある",
    judgedAt: "2026-08-20T00:00:00.000Z",
    judgmentInputHashAtJudgment: null,
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "unknown", company: "yes", material: "unknown" },
    ...overrides,
  };
}

test("観測値が閾値を満たす場合も外部計測を推測しない", () => {
  const funnel: AccessFunnelSnapshot = {
    observedDays: 28,
    rows: [
      {
        productId: "fresh",
        impressions28d: 220,
        detailViews28d: 55,
        listingOutboundClicks28d: 6,
        detailOutboundClicks28d: 5,
      },
    ],
  };
  const summary = summarizeAccessHealth([product("fresh")], funnel, NOW);

  assert.equal(summary.status, "ok");
  assert.equal(summary.productFreshness.technicalEligible, 1);
  assert.equal(summary.onsiteFunnel.status, "ready");
  assert.equal(summary.onsiteFunnel.outboundClicks28d, 11);
  assert.equal(
    summary.externalMeasurement.searchConsole,
    "not-read-by-local-command",
  );
  assert.equal(summary.externalMeasurement.unavailableValuesAreZero, false);
});

test("取得できないファネル値はnullで返し、0件に置き換えない", () => {
  const summary = summarizeAccessHealth(
    [
      product("private-identifier", {
        fetchedAt: "2026-06-01T00:00:00.000Z",
        priceUpdatedAt: "2026-06-01T00:00:00.000Z",
      }),
    ],
    null,
    NOW,
  );

  assert.equal(summary.status, "warning");
  assert.equal(summary.productFreshness.confirmationStale, 1);
  assert.equal(summary.onsiteFunnel.status, "unavailable");
  assert.equal(summary.onsiteFunnel.impressions28d, null);
  assert.equal(summary.onsiteFunnel.detailViews28d, null);
  assert.equal(summary.onsiteFunnel.outboundClicks28d, null);
  assert.doesNotMatch(JSON.stringify(summary), /private-identifier|shop:/);
});
