import assert from "node:assert/strict";
import test from "node:test";
import { productCardImageUrl } from "./product-image";

test("楽天カード画像を320pxへ縮小する", () => {
  assert.equal(
    productCardImageUrl(
      "https://thumbnail.image.rakuten.co.jp/@0_mall/shop/item.jpg?_ex=400x400",
    ),
    "https://thumbnail.image.rakuten.co.jp/@0_mall/shop/item.jpg?_ex=320x320",
  );
});

test("楽天画像にサイズ指定がなくても320pxを付与する", () => {
  assert.equal(
    productCardImageUrl("https://thumbnail.image.rakuten.co.jp/@0_mall/shop/item.jpg"),
    "https://thumbnail.image.rakuten.co.jp/@0_mall/shop/item.jpg?_ex=320x320",
  );
});

test("楽天以外と不正URLは変更しない", () => {
  assert.equal(
    productCardImageUrl("https://m.media-amazon.com/images/I/example.jpg"),
    "https://m.media-amazon.com/images/I/example.jpg",
  );
  assert.equal(productCardImageUrl("not-a-url"), "not-a-url");
});
