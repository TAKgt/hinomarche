import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRakutenAffiliateUrl,
  rakutenItemToRawProduct,
} from "./rakuten";

test("楽天市場URLを楽天アフィリエイト直リンクにする", () => {
  const url = buildRakutenAffiliateUrl(
    "https://search.rakuten.co.jp/search/mall/%E5%8C%85%E4%B8%81/",
    "01234567.89abcdef.01234568.89abcdef",
  );
  const parsed = new URL(url);

  assert.equal(parsed.hostname, "hb.afl.rakuten.co.jp");
  assert.equal(
    parsed.pathname,
    "/hgc/01234567.89abcdef.01234568.89abcdef/",
  );
  assert.equal(
    parsed.searchParams.get("pc"),
    "https://search.rakuten.co.jp/search/mall/%E5%8C%85%E4%B8%81/",
  );
  assert.equal(parsed.searchParams.get("m"), parsed.searchParams.get("pc"));
});

test("楽天市場外のURLは直リンク生成を拒否する", () => {
  assert.throws(
    () =>
      buildRakutenAffiliateUrl(
        "https://example.com/item",
        "01234567.89abcdef.01234568.89abcdef",
      ),
    /楽天市場のHTTPS URLではありません/,
  );
});

test("楽天の送料・セール・商品別ポイント情報をRawProductへ変換する", () => {
  const itemUrl = "https://item.rakuten.co.jp/shop/item-1/";
  const affiliateUrl = buildRakutenAffiliateUrl(
    itemUrl,
    "01234567.89abcdef.01234568.89abcdef",
  );
  const product = rakutenItemToRawProduct(
    {
      itemCode: "shop:item-1",
      itemName: "燕三条 ステンレス鍋",
      itemCaption: "日本製",
      itemUrl: affiliateUrl,
      affiliateUrl,
      itemPrice: 5500,
      mediumImageUrls: ["https://example.com/image.jpg?_ex=128x128"],
      reviewCount: 20,
      reviewAverage: 4.5,
      affiliateRate: 2,
      postageFlag: 1,
      startTime: "2026-07-25 20:00",
      endTime: "2026-07-28 01:59",
      pointRate: 5,
      pointRateStartTime: "2026-07-25 20:00",
      pointRateEndTime: "2026-07-30 09:59",
    },
    "kitchen",
    3,
  );

  assert.equal(product.postageIncluded, true);
  assert.equal(product.affiliateUrl, affiliateUrl);
  assert.equal(product.itemUrl, itemUrl);
  assert.equal(product.saleStartAt, "2026-07-25T20:00:00+09:00");
  assert.equal(product.saleEndAt, "2026-07-28T01:59:00+09:00");
  assert.equal(product.pointRate, 5);
  assert.equal(product.pointRateStartAt, "2026-07-25T20:00:00+09:00");
  assert.equal(product.pointRateEndAt, "2026-07-30T09:59:00+09:00");
  assert.equal(product.searchRank, 3);
});

test("不正・未設定の販促値は表示対象にしない", () => {
  const itemUrl = "https://item.rakuten.co.jp/shop/item-2/";
  const product = rakutenItemToRawProduct(
    {
      itemCode: "shop:item-2",
      itemName: "商品",
      itemCaption: "",
      itemUrl,
      affiliateUrl: buildRakutenAffiliateUrl(
        itemUrl,
        "01234567.89abcdef.01234568.89abcdef",
      ),
      itemPrice: 1000,
      postageFlag: 0,
      startTime: "invalid",
      endTime: null,
      pointRate: 1,
    },
    "zakka",
    1,
  );

  assert.equal(product.postageIncluded, false);
  assert.equal(product.saleStartAt, null);
  assert.equal(product.saleEndAt, null);
  assert.equal(product.pointRate, null);
  assert.equal(product.pointRateStartAt, null);
  assert.equal(product.pointRateEndAt, null);
});
