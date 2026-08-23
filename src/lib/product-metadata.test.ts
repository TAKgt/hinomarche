import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProductMerchantDescriptionExcerpt,
  buildProductMetaDescription,
  buildProductMetaTitle,
  buildRenderedProductMetaTitle,
  PRODUCT_META_DESCRIPTION_MAX_LENGTH,
  PRODUCT_META_TITLE_MAX_LENGTH,
  PRODUCT_MERCHANT_DESCRIPTION_MAX_LENGTH,
  summarizeProductMetadataQuality,
} from "./product-metadata";
import type { Product } from "./types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "example-product",
    source: "rakuten",
    sourceItemId: "example-shop:example-item",
    title: "日本製の調理器具",
    description: null,
    maker: "例示メーカー",
    brand: "例示ブランド",
    imageUrl: null,
    price: 5000,
    fetchedAt: "2026-08-18T00:00:00.000Z",
    contentUpdatedAt: "2026-08-18T00:00:00.000Z",
    priceUpdatedAt: "2026-08-18T00:00:00.000Z",
    affiliateUrl: "https://item.rakuten.co.jp/example-shop/example-item/",
    categorySlug: "kitchen",
    reviewCount: 10,
    reviewAverage: 4.5,
    affiliateRate: 2,
    searchRank: 1,
    demandScore: 50,
    featuredScore: 70,
    score: 80,
    tier: "high",
    evidenceType: "推定",
    evidenceText: "商品情報に国内企業名の記載があります。",
    judgedAt: "2026-08-18T00:00:00.000Z",
    isPublished: true,
    judgmentStatus: "current",
    judgmentInputHash: "a".repeat(64),
    judgmentInputHashAtJudgment: "a".repeat(64),
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "unknown", company: "yes", material: "unknown" },
    ...overrides,
  };
}

test("商品meta descriptionは画面上の事実だけを150文字以内にまとめる", () => {
  const description = buildProductMetaDescription(
    product({ evidenceText: "国内企業名の記載があります。".repeat(20) }),
  );

  assert.equal(description.length <= PRODUCT_META_DESCRIPTION_MAX_LENGTH, true);
  assert.match(description, /^日本製の調理器具。AI日本度80%（AI推定）。/);
  assert.doesNotMatch(description, /在庫あり|送料無料|公式認定/);
});

test("商品meta titleはサイト名を含めて60文字以内にする", () => {
  const target = product({
    title:
      "日本製の調理器具 とても長い商品名 仕様A 仕様B 仕様C 仕様D 仕様E 仕様F 仕様G 仕様H 仕様I 仕様J",
  });
  const title = buildProductMetaTitle(target);
  const renderedTitle = buildRenderedProductMetaTitle(target);

  assert.match(title, /^日本製の調理器具/);
  assert.equal(renderedTitle.endsWith(" | ヒノマルシェ"), true);
  assert.equal(renderedTitle.length <= PRODUCT_META_TITLE_MAX_LENGTH, true);
});

test("販売元説明は先頭の事実だけを600文字以内の抜粋にする", () => {
  const source = `販売元の商品情報です。${"仕様と利用条件の説明。".repeat(80)}末尾の販促文`;
  const excerpt = buildProductMerchantDescriptionExcerpt(source);

  assert.ok(excerpt);
  assert.match(excerpt, /^販売元の商品情報です。/);
  assert.equal(
    excerpt.length <= PRODUCT_MERCHANT_DESCRIPTION_MAX_LENGTH,
    true,
  );
  assert.equal(excerpt.endsWith("…"), true);
  assert.doesNotMatch(excerpt, /末尾の販促文/);
  assert.equal(buildProductMerchantDescriptionExcerpt(null), null);
});

test("品質監査は個別値を返さず重複・長さだけを集計する", () => {
  const first = product({
    description: "販売元情報".repeat(200),
    evidenceText: "根拠".repeat(100),
  });
  const second = product({
    id: "another-product",
    sourceItemId: "example-shop:another-item",
    description: null,
    evidenceText: "別の根拠".repeat(100),
  });
  const summary = summarizeProductMetadataQuality([first, second]);

  assert.equal(summary.products, 2);
  assert.deepEqual(summary.title, {
    duplicateGroups: 1,
    duplicateRows: 2,
    over60Characters: 0,
  });
  assert.equal(summary.description.over160Characters, 0);
  assert.equal(summary.description.shortenedToTarget, 2);
  assert.equal(
    summary.description.maximumCharacters <=
      PRODUCT_META_DESCRIPTION_MAX_LENGTH,
    true,
  );
  assert.deepEqual(summary.merchantDescription, {
    withSourceText: 1,
    shortenedToTarget: 1,
    overTargetAfterFormatting: 0,
    maximumCharacters: PRODUCT_MERCHANT_DESCRIPTION_MAX_LENGTH,
  });
  assert.doesNotMatch(JSON.stringify(summary), /example-product|another-product/);
});
