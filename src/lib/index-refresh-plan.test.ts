import assert from "node:assert/strict";
import test from "node:test";
import { planIndexRefresh } from "./index-refresh-plan";
import type { ProductPageData } from "./types";

const NOW = new Date("2026-08-19T00:00:00.000Z");

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
    fetchedAt: "2026-08-18T00:00:00.000Z",
    contentUpdatedAt: "2026-08-18T00:00:00.000Z",
    priceUpdatedAt: "2026-08-18T00:00:00.000Z",
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
    judgedAt: "2026-08-18T00:00:00.000Z",
    judgmentInputHashAtJudgment: null,
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "unknown", company: "yes", material: "unknown" },
    ...overrides,
  };
}

test("30日内の観測coverageから安全余裕付き維持集合をdry-runする", () => {
  const fresh = Array.from({ length: 8 }, (_, index) =>
    product(`fresh-${index}`, {
      title:
        index === 0
          ? "燕三条 包丁"
          : `日本製 調理器具 ${index}`,
      categorySlug: index % 2 === 0 ? "kitchen" : "tableware",
      demandScore: 100 - index,
    }),
  );
  const stale = Array.from({ length: 2 }, (_, index) =>
    product(`stale-${index}`, {
      fetchedAt: "2026-06-01T00:00:00.000Z",
    }),
  );
  const pending = Array.from({ length: 2 }, (_, index) =>
    product(`pending-${index}`, {
      isPublished: false,
      judgmentStatus: "pending",
      score: null,
      tier: null,
      evidenceType: null,
      evidenceText: null,
      judgedAt: null,
      judgmentInputHashAtJudgment: null,
      consistencyStatus: null,
      checks: null,
    }),
  );

  const plan = planIndexRefresh([...fresh, ...stale, ...pending], NOW, {
    focusTheme: "tsubame_kitchen",
  });

  assert.equal(plan.population.allProducts, 12);
  assert.equal(plan.population.published, 10);
  assert.equal(plan.population.pendingBacklog, 2);
  assert.equal(plan.population.technicalEligible, 8);
  assert.equal(plan.population.publishedConfirmedWithinHorizon, 8);
  assert.equal(plan.capacity.theoreticalSearchRowsPerDay, 120);
  assert.equal(plan.capacity.safeMaintenanceBudget, 6);
  assert.equal(plan.maintenanceCohort.selected, 6);
  assert.equal(plan.maintenanceCohort.overflowTechnicalEligible, 2);
  assert.equal(
    Object.values(plan.maintenanceCohort.byCategory).reduce(
      (total, count) => total + count,
      0,
    ),
    6,
  );
  assert.equal(plan.maintenanceCohort.byPriorityTheme.tsubame_kitchen, 1);
  assert.equal(plan.risk.allPublishedMaintainableByObservedCoverage, false);
  assert.equal(
    plan.risk.currentTechnicalEligibleWithinObservedCoverage,
    true,
  );
  assert.equal(plan.risk.maintenanceCohortWithinSafetyBudget, true);
  assert.doesNotMatch(JSON.stringify(plan), /fresh-0|燕三条 包丁/);
});
