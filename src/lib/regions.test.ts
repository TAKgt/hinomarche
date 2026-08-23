import assert from "node:assert/strict";
import test from "node:test";
import { getRegion, REGIONS } from "./regions";

test("H1の改行用chunkを連結してもmetadataのtitleと一致する", () => {
  for (const region of REGIONS) {
    if (!region.titleChunks) continue;
    assert.equal(region.titleChunks.join(""), region.title);
    assert.equal(region.titleChunks.every((chunk) => chunk.length > 0), true);
  }
});

test("燕三条H1は商品種別の語中で分割しない", () => {
  const region = getRegion("tsubame-sanjo");
  assert.ok(region?.titleChunks);
  assert.equal(region.titleChunks.includes("・水切りラック"), true);
  assert.equal(region.titleChunks.includes("・調理器具"), true);
});
