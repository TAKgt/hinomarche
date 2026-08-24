import assert from "node:assert/strict";
import test from "node:test";
import {
  selectFreshnessPriorityCandidates,
  summarizeFreshnessPriorityQueue,
  type FreshnessPriorityMetric,
} from "./freshness-priority";
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
    title: `日本製 調理器具 ${id}`,
    description: "商品説明",
    maker: "メーカー",
    brand: "ブランド",
    imageUrl: null,
    price: 3000,
    fetchedAt: "2026-08-01T00:00:00.000Z",
    contentUpdatedAt: "2026-08-01T00:00:00.000Z",
    priceUpdatedAt: "2026-08-01T00:00:00.000Z",
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
    evidenceType: "産地表記",
    evidenceText: "商品情報に地域名の記載がある",
    judgedAt: "2026-08-01T00:00:00.000Z",
    judgmentInputHashAtJudgment: null,
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "unknown", company: "yes", material: "unknown" },
    ...overrides,
  };
}

test("期限直前と鮮度だけが原因の復帰候補を選び、他の品質問題を除外する", () => {
  const records = [
    product("protect", { fetchedAt: "2026-07-26T00:00:00.000Z" }),
    product("recover-metric", {
      fetchedAt: "2026-06-01T00:00:00.000Z",
    }),
    product("recover-theme", {
      title: "燕三条 包丁",
      fetchedAt: "2026-06-02T00:00:00.000Z",
    }),
    product("blocked", {
      fetchedAt: "2026-06-01T00:00:00.000Z",
      consistencyStatus: "blocked",
      consistencyIssues: ["stored"],
    }),
    product("not-due", { fetchedAt: "2026-08-20T00:00:00.000Z" }),
  ];
  const metrics: FreshnessPriorityMetric[] = [
    {
      productId: "recover-metric",
      impressions28d: 120,
      detailViews28d: 6,
      listingOutboundClicks28d: 1,
      detailOutboundClicks28d: 0,
    },
  ];

  const selected = selectFreshnessPriorityCandidates(records, NOW, {
    limit: 3,
    observedMetricDays: 28,
    metrics,
    focusTheme: "tsubame_kitchen",
  });

  assert.deepEqual(
    selected.map((candidate) => candidate.product.id),
    ["protect", "recover-metric", "recover-theme"],
  );
  assert.deepEqual(
    selected.map((candidate) => candidate.stage),
    [
      "protect_expiring",
      "recover_observed_demand",
      "recover_priority_theme",
    ],
  );
  assert.equal(selected.some((candidate) => candidate.product.id === "blocked"), false);
});

test("metrics未取得を0件扱いせず、匿名の件数だけを返す", () => {
  const records = [
    product("secret-a", { fetchedAt: "2026-06-01T00:00:00.000Z" }),
    product("secret-b", {
      categorySlug: "tableware",
      fetchedAt: "2026-06-01T00:00:00.000Z",
    }),
  ];

  const summary = summarizeFreshnessPriorityQueue(records, NOW, {
    limit: 2,
    observedMetricDays: null,
    metrics: null,
  });

  assert.equal(summary.metrics.status, "unavailable");
  assert.equal(summary.metrics.rows, null);
  assert.equal(summary.metrics.matchedCandidates, null);
  assert.equal(summary.queue.selected, 2);
  assert.equal(summary.queue.recovery, 2);
  assert.equal(summary.safeguards.databaseWrites, 0);
  assert.equal(summary.safeguards.rankingFieldUpdates, 0);
  assert.doesNotMatch(JSON.stringify(summary), /secret-a|secret-b|shop:/);
});

test("カテゴリを一巡してから同じカテゴリの次候補へ進む", () => {
  const records = [
    product("kitchen-1", { fetchedAt: "2026-06-01T00:00:00.000Z" }),
    product("kitchen-2", { fetchedAt: "2026-06-02T00:00:00.000Z" }),
    product("tableware-1", {
      categorySlug: "tableware",
      fetchedAt: "2026-06-03T00:00:00.000Z",
    }),
  ];

  const selected = selectFreshnessPriorityCandidates(records, NOW, {
    limit: 2,
  });
  assert.equal(new Set(selected.map((candidate) => candidate.product.categorySlug)).size, 2);
});
