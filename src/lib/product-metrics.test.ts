import assert from "node:assert/strict";
import test from "node:test";
import {
  productPlacementFragment,
  resolveProductPlacementLocation,
} from "./product-metrics";

test("商品詳細リンク用の配置情報はクエリではなくフラグメントへ組み立てる", () => {
  assert.equal(
    productPlacementFragment({
      surface: "category",
      surfaceKey: "kitchen",
      position: 3,
    }),
    "#surface=category&position=3&context=kitchen",
  );
});

test("フラグメントの配置情報を読み、表示用URLから取り除く", () => {
  assert.deepEqual(
    resolveProductPlacementLocation({
      pathname: "/product/example",
      search: "",
      hash: "#surface=related&position=2&context=kitchen",
    }),
    {
      placement: {
        surface: "related",
        surfaceKey: "kitchen",
        position: 2,
      },
      cleanHref: "/product/example",
    },
  );
});

test("旧クエリの配置情報も読み、無関係なクエリとアンカーは保持する", () => {
  assert.deepEqual(
    resolveProductPlacementLocation({
      pathname: "/product/example",
      search: "?ref=guide&surface=search&position=4",
      hash: "#details",
    }),
    {
      placement: {
        surface: "search",
        surfaceKey: null,
        position: 4,
      },
      cleanHref: "/product/example?ref=guide#details",
    },
  );
});

test("不正または閲覧計測対象外の配置情報は送らずURLだけ清掃する", () => {
  for (const location of [
    { search: "?surface=product&position=1", hash: "" },
    { search: "", hash: "#surface=unknown&position=1" },
    {
      search: "",
      hash: "#surface=category&position=1&context=INVALID_VALUE",
    },
    {
      search: "",
      hash: "#surface=category&position=999&context=kitchen",
    },
  ]) {
    assert.deepEqual(
      resolveProductPlacementLocation({
        pathname: "/product/example",
        ...location,
      }),
      {
        placement: null,
        cleanHref: "/product/example",
      },
    );
  }
});

test("配置情報のないURLは変更しない", () => {
  assert.deepEqual(
    resolveProductPlacementLocation({
      pathname: "/product/example",
      search: "?ref=guide",
      hash: "#details",
    }),
    {
      placement: null,
      cleanHref: null,
    },
  );
});
