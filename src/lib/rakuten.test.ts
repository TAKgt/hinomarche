import assert from "node:assert/strict";
import test from "node:test";
import { rakutenItemToRawProduct } from "./rakuten";

test("楽天の送料・セール・商品別ポイント情報をRawProductへ変換する", () => {
  const product = rakutenItemToRawProduct(
    {
      itemCode: "shop:item-1",
      itemName: "燕三条 ステンレス鍋",
      itemCaption: "日本製",
      itemUrl: "https://item.rakuten.co.jp/shop/item-1/",
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
  assert.equal(product.saleStartAt, "2026-07-25T20:00:00+09:00");
  assert.equal(product.saleEndAt, "2026-07-28T01:59:00+09:00");
  assert.equal(product.pointRate, 5);
  assert.equal(product.pointRateStartAt, "2026-07-25T20:00:00+09:00");
  assert.equal(product.pointRateEndAt, "2026-07-30T09:59:00+09:00");
  assert.equal(product.searchRank, 3);
});

test("不正・未設定の販促値は表示対象にしない", () => {
  const product = rakutenItemToRawProduct(
    {
      itemCode: "shop:item-2",
      itemName: "商品",
      itemCaption: "",
      itemUrl: "https://item.rakuten.co.jp/shop/item-2/",
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
