import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProductPageMetadata,
  requireProductPage,
  resolveProductPage,
} from "./product-page-resolution";
import type { ProductPageData } from "./types";

const now = new Date("2026-07-25T12:00:00.000Z");

function page(overrides: Partial<ProductPageData> = {}): ProductPageData {
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

test("current商品は200表示・technical index・CTA対象になる", () => {
  const resolution = resolveProductPage(page(), now);
  assert.equal(resolution.urlVisible, true);
  assert.equal(resolution.aiState, "current");
  assert.equal(resolution.indexEligible, true);
  assert.equal(resolution.purchaseLinkEligible, true);
  assert.ok(resolution.currentProduct);
});

for (const status of ["pending", "blocked"] as const) {
  test(`${status}商品は200+noindexで古い判定とCTAを使用しない`, () => {
    const product = page({
      isPublished: false,
      judgmentStatus: status,
      score: null,
      tier: null,
      evidenceType: null,
      evidenceText: null,
      judgedAt: null,
      judgmentInputHashAtJudgment: null,
      consistencyStatus: null,
      checks: null,
    });
    const resolution = resolveProductPage(product, now);
    const metadata = buildProductPageMetadata(product, now);

    assert.equal(resolution.urlVisible, true);
    assert.equal(resolution.aiState, status);
    assert.equal(resolution.indexEligible, false);
    assert.equal(resolution.purchaseLinkEligible, false);
    assert.equal(resolution.currentProduct, null);
    assert.deepEqual(metadata.robots, { index: false, follow: true });
    assert.equal(
      metadata.alternates?.canonical,
      `/product/${product.id}`,
    );
    assert.doesNotMatch(String(metadata.description), /90|生産国：日本/);
  });
}

test("hash不一致のstale商品は200+noindexで古い判定を使用しない", () => {
  const product = page({ judgmentInputHashAtJudgment: "b".repeat(64) });
  const resolution = resolveProductPage(product, now);
  assert.equal(resolution.aiState, "stale");
  assert.equal(resolution.indexEligible, false);
  assert.equal(resolution.purchaseLinkEligible, false);
  assert.equal(resolution.currentProduct, null);
});

test("元情報内の矛盾があるcurrent商品もAI判定を表示せず安全側で保留する", () => {
  const product = page({
    title: "14年連続「特A」受賞米",
    description: "特Aを13年連続で獲得。別の箇所では15年連続と記載。",
    evidenceText: "特Aを15年連続で獲得",
  });
  const resolution = resolveProductPage(product, now);
  const metadata = buildProductPageMetadata(product, now);

  assert.equal(resolution.aiState, "blocked");
  assert.equal(resolution.indexEligible, false);
  assert.equal(resolution.purchaseLinkEligible, false);
  assert.equal(resolution.currentProduct, null);
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.doesNotMatch(String(metadata.description), /13年|14年|15年/);
});

test("存在しない商品だけ404にする", () => {
  assert.equal(requireProductPage(page()).id, page().id);
  assert.throws(
    () => requireProductPage<ProductPageData>(null),
    /NEXT_HTTP_ERROR_FALLBACK;404/,
  );
});
