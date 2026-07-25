import assert from "node:assert/strict";
import test from "node:test";
import { summarizeProductPopulation } from "./product-index-audit";
import type { ProductPageData } from "./types";

const now = new Date("2026-07-25T12:00:00.000Z");

function record(overrides: Partial<ProductPageData> = {}): ProductPageData {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "rakuten",
    sourceItemId: "shop:item",
    title: "日本製 包丁 165mm",
    description: "生産国：日本。刃渡り165mm",
    maker: "メーカー",
    brand: "ブランド",
    imageUrl: null,
    price: 5500,
    fetchedAt: "2026-07-24T00:00:00.000Z",
    contentUpdatedAt: "2026-07-24T00:00:00.000Z",
    priceUpdatedAt: "2026-07-24T00:00:00.000Z",
    affiliateUrl: "https://af.moshimo.com/af/c/click?a_id=test",
    categorySlug: "kitchen",
    reviewCount: 10,
    reviewAverage: 4.5,
    affiliateRate: 2,
    searchRank: 1,
    demandScore: 50,
    featuredScore: 70,
    isPublished: true,
    judgmentStatus: "current",
    judgmentInputHash: "a".repeat(64),
    score: 90,
    tier: "high",
    evidenceType: "生産国表記",
    evidenceText: "生産国：日本、刃渡り165mm",
    judgedAt: "2026-07-24T01:00:00.000Z",
    judgmentInputHashAtJudgment: "a".repeat(64),
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "yes", company: "unknown", material: "unknown" },
    ...overrides,
  };
}

test("全商品監査でcurrent・pending・blocked・URL・sitemapを別集計する", () => {
  const records = [
    record(),
    record({
      id: "22222222-2222-4222-8222-222222222222",
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
    record({
      id: "33333333-3333-4333-8333-333333333333",
      isPublished: false,
      judgmentStatus: "blocked",
      score: null,
      tier: null,
      evidenceType: null,
      evidenceText: null,
      judgedAt: null,
      judgmentInputHashAtJudgment: null,
      consistencyStatus: null,
      checks: null,
    }),
  ];

  const summary = summarizeProductPopulation(records, now);
  assert.equal(summary.productsTotal, 3);
  assert.deepEqual(summary.publication, { published: 1, unpublished: 2 });
  assert.deepEqual(summary.judgmentStatus, {
    current: 1,
    pending: 1,
    blocked: 1,
  });
  assert.equal(summary.currentHashMatched, 1);
  assert.equal(summary.publicUrl200, 3);
  assert.equal(summary.notFoundEquivalent, 0);
  assert.equal(summary.sitemapEligible, 1);
  assert.equal(summary.technicalEligible, 1);
  assert.equal(summary.editorialEligible, 0);
  assert.equal(summary.primarySourceUnconfirmed, 3);
  assert.equal(summary.technicalReasonCounts.ai_judgment_stale, 2);

  const beforeUrlMigration = summarizeProductPopulation(records, now, {
    safePendingUrlsEnabled: false,
  });
  assert.equal(beforeUrlMigration.publicUrl200, 1);
  assert.equal(beforeUrlMigration.notFoundEquivalent, 2);
});
