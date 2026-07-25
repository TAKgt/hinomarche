import assert from "node:assert/strict";
import test from "node:test";
import { readAllPages } from "./read-all-pages";

test("1000件を超える監査対象を重複・欠落なく全件取得する", async () => {
  const source = Array.from({ length: 2507 }, (_, index) => index);
  const calls: Array<[number, number]> = [];
  const rows = await readAllPages(async (from, to) => {
    calls.push([from, to]);
    return source.slice(from, to + 1);
  });

  assert.deepEqual(rows, source);
  assert.deepEqual(calls, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
});

test("件数がページサイズの倍数でも空ページを確認して終了する", async () => {
  const source = Array.from({ length: 2000 }, (_, index) => index);
  let calls = 0;
  const rows = await readAllPages(async (from, to) => {
    calls++;
    return source.slice(from, to + 1);
  });

  assert.equal(rows.length, 2000);
  assert.equal(calls, 3);
});
