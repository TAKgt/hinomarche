import assert from "node:assert/strict";
import test from "node:test";
import robots from "../app/robots";
import {
  assessProductEditorialQuality,
  assessProductIndexQuality,
  buildProductMetadata,
  summarizeProductIndexQuality,
} from "./product-index-quality";
import { requireProductPage } from "./product-page-resolution";
import { productSitemapEntries } from "./product-sitemap";
import type { Product } from "./types";

const now = new Date("2026-07-25T12:00:00.000Z");

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "rakuten",
    sourceItemId: "shop:item-1",
    title: "日本製 ステンレス包丁 165mm",
    description: "生産国：日本。刃渡り165mm",
    maker: "日の丸刃物",
    brand: "日の丸",
    imageUrl: "https://example.com/item.jpg",
    price: 5500,
    fetchedAt: "2026-07-24T00:00:00.000Z",
    contentUpdatedAt: "2026-07-20T00:00:00.000Z",
    priceUpdatedAt: "2026-07-24T00:00:00.000Z",
    affiliateUrl:
      "https://af.moshimo.com/af/c/click?a_id=example&p_id=54",
    categorySlug: "kitchen",
    reviewCount: 20,
    reviewAverage: 4.5,
    affiliateRate: 2,
    searchRank: 1,
    demandScore: 50,
    featuredScore: 80,
    score: 95,
    tier: "high",
    evidenceType: "生産国表記",
    evidenceText: "生産国：日本、刃渡り165mm",
    judgedAt: "2026-07-20T01:00:00.000Z",
    isPublished: true,
    judgmentStatus: "current",
    judgmentInputHash: "a".repeat(64),
    judgmentInputHashAtJudgment: "a".repeat(64),
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "yes", company: "yes", material: "unknown" },
    ...overrides,
  };
}

test("canonical: index可否にかかわらず商品URLへ正規化する", () => {
  const current = buildProductMetadata(product(), now);
  const stale = buildProductMetadata(
    product({ fetchedAt: "2026-01-01T00:00:00.000Z" }),
    now,
  );

  assert.equal(
    current.alternates?.canonical,
    "/product/11111111-1111-4111-8111-111111111111",
  );
  assert.equal(stale.alternates?.canonical, current.alternates?.canonical);
  assert.equal(current.robots, undefined);
  assert.deepEqual(stale.robots, { index: false, follow: true });
});

test("404: 存在しない商品だけnotFoundを送出する", () => {
  assert.equal(requireProductPage(product()).id, product().id);
  assert.throws(
    () => requireProductPage(null),
    /NEXT_HTTP_ERROR_FALLBACK;404/,
  );
});

test("robots: noindex商品も再確認できるようproduct URLのクロールを許可する", () => {
  const value = robots();
  const rules = Array.isArray(value.rules) ? value.rules[0] : value.rules;
  const disallow = Array.isArray(rules.disallow)
    ? rules.disallow
    : [rules.disallow].filter(Boolean);

  assert.equal(rules.allow, "/");
  assert.equal(disallow.some((path) => path?.startsWith("/product/")), false);
  assert.match(String(value.sitemap), /\/sitemap\.xml$/);
});

test("sitemap: 商品ページと同じ品質判定で未達商品を除外する", () => {
  const eligible = product();
  const stale = product({
    id: "22222222-2222-4222-8222-222222222222",
    fetchedAt: "2026-01-01T00:00:00.000Z",
  });
  const entries = productSitemapEntries(
    [eligible, stale],
    "https://www.hinomarche.com",
    now,
  );

  assert.deepEqual(
    entries.map((entry) => entry.url),
    [`https://www.hinomarche.com/product/${eligible.id}`],
  );
  assert.equal(
    assessProductIndexQuality(stale, now).reasons.includes(
      "last_confirmation_stale",
    ),
    true,
  );
});

test("販売元参照と一次情報出典を別々に評価する", () => {
  const technical = assessProductIndexQuality(product(), now);
  assert.equal(technical.technicalEligible, true);
  assert.equal(technical.editorialEligible, false);
  assert.equal(
    technical.editorialReasons.includes("primary_source_url_missing"),
    true,
  );
  assert.equal(
    technical.reasons.includes("merchant_reference_missing"),
    false,
  );

  const editorial = assessProductEditorialQuality({
    primarySourceUrl: "https://manufacturer.example.jp/products/knife",
    sourceExcerpt: "製造国：日本",
    retrievedAt: "2026-07-24T00:00:00.000Z",
    humanVerifiedAt: "2026-07-25T00:00:00.000Z",
    hasIndependentComparison: true,
  });
  assert.deepEqual(editorial, { eligible: true, reasons: [] });
});

test("改善後の復帰: URLや公開状態を変えずに再評価でsitemapへ戻る", () => {
  const stale = product({ fetchedAt: "2026-01-01T00:00:00.000Z" });
  const recovered = product({ fetchedAt: "2026-07-25T00:00:00.000Z" });
  const baseUrl = "https://www.hinomarche.com";

  assert.equal(productSitemapEntries([stale], baseUrl, now).length, 0);
  assert.equal(productSitemapEntries([recovered], baseUrl, now).length, 1);
  assert.deepEqual(summarizeProductIndexQuality([stale], now), {
    total: 1,
    technicalEligible: 0,
    technicalExcluded: 1,
    editorialEligible: 0,
    primarySourceUnconfirmed: 1,
    indexable: 0,
    excluded: 1,
    reasonCounts: {
      last_confirmation_missing: 0,
      last_confirmation_stale: 1,
      ai_judgment_missing: 0,
      ai_judgment_stale: 0,
      merchant_reference_missing: 0,
      information_inconsistent: 0,
      not_for_sale: 0,
    },
    editorialReasonCounts: {
      primary_source_url_missing: 1,
      source_excerpt_missing: 1,
      source_retrieved_at_missing: 1,
      human_verification_missing: 1,
      independent_comparison_missing: 1,
    },
    consistencyIssueCounts: {
      checks_missing: 0,
      year_not_in_source: 0,
      number_not_in_source: 0,
      manufacturing_origin_conflict: 0,
      conflicting_consecutive_year_claim: 0,
      conflicting_source_claim: 0,
      stored_consistency_blocked: 0,
      stored_consistency_issue: 0,
    },
  });
});
