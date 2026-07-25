import assert from "node:assert/strict";
import test from "node:test";
import { fetchProductsForKeyword } from "./ingest";

test("取得失敗: 楽天API失敗を記録し、収集全体を例外終了させない", async () => {
  let waits = 0;
  const result = await fetchProductsForKeyword("包丁", "kitchen", false, {
    searchRakuten: async () => {
      throw new Error("temporary unavailable");
    },
    searchAmazon: async () => {
      throw new Error("呼ばれない");
    },
    sleep: async () => {
      waits++;
    },
  });

  assert.deepEqual(result.products, []);
  assert.equal(result.amazonEnabled, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /楽天検索失敗.*temporary unavailable/);
  assert.equal(waits, 1);
});
