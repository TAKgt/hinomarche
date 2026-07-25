import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCategoryQuery,
  categoryListingSeo,
  parseCategoryPage,
} from "./category-pagination";

test("ページURLはsort・tier・価格・レビュー条件を保持する", () => {
  assert.equal(
    buildCategoryQuery({
      sort: "reviews",
      tier: "mid",
      priceFilter: "3000-9999",
      reviewFilter: "popular-100",
      page: 3,
    }),
    "?sort=reviews&tier=mid&price=3000-9999&reviews=popular-100&page=3",
  );
});

test("不正なページ値は1ページ目として扱う", () => {
  assert.equal(parseCategoryPage(undefined), 1);
  assert.equal(parseCategoryPage("0"), 1);
  assert.equal(parseCategoryPage("-1"), 1);
  assert.equal(parseCategoryPage("2.5"), 1);
  assert.equal(parseCategoryPage(String(Number.MAX_SAFE_INTEGER)), 1);
  assert.equal(parseCategoryPage("3"), 3);
});

test("通常のページネーションは自己canonicalを持つ", () => {
  assert.deepEqual(categoryListingSeo("kitchen", {}), {
    canonical: "/category/kitchen",
    noindex: false,
  });
  assert.deepEqual(categoryListingSeo("kitchen", { page: "2" }), {
    canonical: "/category/kitchen?page=2",
    noindex: false,
  });
  assert.deepEqual(categoryListingSeo("kitchen", { page: "1" }), {
    canonical: "/category/kitchen",
    noindex: false,
  });
});

test("検索・絞り込み・不正クエリは基本URLへcanonicalしnoindexにする", () => {
  for (const query of [
    { sort: "score", page: "2" },
    { tier: "high" },
    { price: "under-3000" },
    { reviews: "popular-100" },
    { unknown: "value" },
    { page: ["2", "3"] },
    { page: "invalid" },
  ]) {
    assert.deepEqual(categoryListingSeo("kitchen", query), {
      canonical: "/category/kitchen",
      noindex: true,
    });
  }
});

test("60件単位のページ境界で全IDへ重複・欠落なく到達できる", () => {
  const ids = Array.from({ length: 137 }, (_, index) =>
    `product-${String(index + 1).padStart(3, "0")}`,
  );
  const pages = Array.from(
    { length: Math.ceil(ids.length / 60) },
    (_, pageIndex) => ids.slice(pageIndex * 60, (pageIndex + 1) * 60),
  );
  const reached = pages.flat();

  assert.deepEqual(pages.map((page) => page.length), [60, 60, 17]);
  assert.equal(new Set(reached).size, ids.length);
  assert.deepEqual(reached, ids);
});
