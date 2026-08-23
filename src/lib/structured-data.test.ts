import assert from "node:assert/strict";
import test from "node:test";
import { productStructuredData } from "./structured-data";
import {
  buildProductMetaDescription,
  PRODUCT_META_DESCRIPTION_MAX_LENGTH,
} from "./product-metadata";
import type { Product } from "./types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "example-product",
    source: "rakuten",
    sourceItemId: "example-shop:example-item",
    title: "燕三条表記の調理器具",
    description: null,
    maker: "例示メーカー",
    brand: "例示ブランド",
    imageUrl: "https://example.com/product.jpg",
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
    evidenceText: "商品情報からAIが推定",
    judgedAt: "2026-08-18T00:00:00.000Z",
    isPublished: true,
    judgmentStatus: "current",
    judgmentInputHash: "a".repeat(64),
    judgmentInputHashAtJudgment: "a".repeat(64),
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "unknown", company: "unknown", material: "unknown" },
    ...overrides,
  };
}

test("Product snippetに画面表示と一致する商品名・価格・通貨を含める", () => {
  const data = productStructuredData(
    product(),
    "キッチン用品",
  );
  const productData = data[0] as Record<string, unknown>;
  const breadcrumbData = data[1] as Record<string, unknown>;
  const offer = productData.offers as Record<string, unknown>;

  assert.equal(productData["@type"], "Product");
  assert.equal(productData.name, "燕三条表記の調理器具");
  assert.equal(productData.description, buildProductMetaDescription(product()));
  assert.ok(String(productData.description).includes("AI推定"));
  assert.ok(String(productData.description).length <= PRODUCT_META_DESCRIPTION_MAX_LENGTH);
  assert.equal(offer["@type"], "Offer");
  assert.equal(offer.price, 5000);
  assert.equal(offer.priceCurrency, "JPY");
  assert.equal(breadcrumbData["@type"], "BreadcrumbList");
});

test("在庫・返品・配送・レビューを取得していないときは構造化データで補わない", () => {
  const productData = productStructuredData(
    product(),
    "キッチン用品",
  )[0] as Record<string, unknown>;
  const offer = productData.offers as Record<string, unknown>;

  assert.equal("availability" in offer, false);
  assert.equal("shippingDetails" in offer, false);
  assert.equal("hasMerchantReturnPolicy" in offer, false);
  assert.equal("aggregateRating" in productData, false);
  assert.equal("review" in productData, false);
  assert.equal("sku" in productData, false);
  assert.equal("priceValidUntil" in offer, false);
});

test("画面に価格を表示できない商品にはOfferを出さない", () => {
  const productData = productStructuredData(
    product({ price: null }),
    "キッチン用品",
  )[0] as Record<string, unknown>;

  assert.equal("offers" in productData, false);
});
