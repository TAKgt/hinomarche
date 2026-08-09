import assert from "node:assert/strict";
import test from "node:test";
import {
  EDITORIAL_PRIORITY_THEMES,
  selectEditorialPriorityCandidates,
} from "./editorial-priority";
import type { ProductPageData } from "./types";

const NOW = new Date("2026-08-09T00:00:00.000Z");

function product(
  id: string,
  title: string,
  overrides: Partial<ProductPageData> = {},
): ProductPageData {
  return {
    id,
    source: "rakuten",
    sourceItemId: `item-${id}`,
    title,
    description: null,
    maker: null,
    brand: null,
    imageUrl: null,
    price: 3000,
    fetchedAt: "2026-08-08T00:00:00.000Z",
    contentUpdatedAt: "2026-08-08T00:00:00.000Z",
    priceUpdatedAt: "2026-08-08T00:00:00.000Z",
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
    judgedAt: "2026-08-08T00:00:00.000Z",
    judgmentInputHashAtJudgment: null,
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "unknown", company: "yes", material: "unknown" },
    ...overrides,
  };
}

test("4テーマから各5件を選び、合計20件にする", () => {
  const products = [
    ...Array.from({ length: 6 }, (_, index) => product(`t-${index}`, `燕三条 包丁 ${index}`)),
    ...Array.from({ length: 6 }, (_, index) => product(`r-${index}`, `IH 炊飯器 ${index}`)),
    ...Array.from({ length: 6 }, (_, index) => product(`i-${index}`, `今治 タオル 返礼品 ${index}`)),
    ...Array.from({ length: 6 }, (_, index) => product(`g-${index}`, `日本茶 煎茶 ${index}`, { categorySlug: "food" })),
  ];

  const result = selectEditorialPriorityCandidates(products, NOW);
  assert.equal(result.candidates.length, 20);
  for (const theme of EDITORIAL_PRIORITY_THEMES) {
    assert.equal(result.selectedByTheme[theme.id], 5);
    assert.equal(result.matchingEligibleByTheme[theme.id], 6);
  }
});

test("情報不整合と技術品質ゲート外の商品を候補から除外する", () => {
  const inconsistent = product("bad-1", "燕三条 包丁", {
    consistencyStatus: "blocked",
    consistencyIssues: ["manufacturing_origin_conflict"],
  });
  const pending = product("bad-2", "燕三条 水切りラック", {
    isPublished: false,
    judgmentStatus: "pending",
    score: null,
    tier: null,
    evidenceType: null,
    evidenceText: null,
    judgedAt: null,
    checks: null,
  });
  const safe = product("safe", "燕三条 調理ボウル");

  const result = selectEditorialPriorityCandidates([inconsistent, pending, safe], NOW);
  assert.deepEqual(result.candidates.map(({ product: item }) => item.id), ["safe"]);
  assert.equal(result.informationInconsistentExcluded, 1);
  assert.equal(result.technicalEligiblePool, 1);
});

test("複数テーマに一致する商品を重複選定しない", () => {
  const shared = product("shared", "燕三条 日本茶用キッチン道具");
  const result = selectEditorialPriorityCandidates([shared], NOW, 5);
  assert.equal(result.candidates.length, 1);
  assert.equal(new Set(result.candidates.map(({ product: item }) => item.id)).size, 1);
});

test("同条件では販売元レビュー件数の多い候補を先にする", () => {
  const low = product("low", "IH 炊飯器", { reviewCount: 3 });
  const high = product("high", "IH 炊飯器", { reviewCount: 200 });
  const result = selectEditorialPriorityCandidates([low, high], NOW, 1);
  const riceCooker = result.candidates.find(({ theme }) => theme.id === "rice_cookers");
  assert.equal(riceCooker?.product.id, "high");
});

test("販売元説明に混ざった別商品のテーマ語だけでは候補にしない", () => {
  const unrelated = product("unrelated", "無添加 だしパック", {
    description: "炊飯器や調理器具も取り扱っています",
    categorySlug: "food",
  });
  const result = selectEditorialPriorityCandidates([unrelated], NOW);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.matchingEligibleByTheme.rice_cookers, 0);
});
