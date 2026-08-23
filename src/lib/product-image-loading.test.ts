import assert from "node:assert/strict";
import test from "node:test";
import { productCardImageLoading } from "./product-image-loading";

test("商品一覧が主内容の画面では先頭2画像だけを優先する", () => {
  assert.deepEqual(productCardImageLoading("category", 0), {
    loading: "eager",
    fetchPriority: "high",
  });
  assert.deepEqual(productCardImageLoading("search", 1), {
    loading: "eager",
    fetchPriority: "high",
  });
  assert.deepEqual(productCardImageLoading("popular", 2), {
    loading: "lazy",
    fetchPriority: "auto",
  });
});

test("TOP・特集・産地・関連記事では先行コンテンツを優先する", () => {
  for (const surface of ["home", "feature", "region", "related"] as const) {
    assert.deepEqual(productCardImageLoading(surface, 0), {
      loading: "lazy",
      fetchPriority: "auto",
    });
  }
});
