import assert from "node:assert/strict";
import test from "node:test";
import { staticSitemapEntries } from "./static-sitemap";

test("静的・集約ページのsitemapへ推測日時と無効な優先度を出さない", () => {
  const entries = staticSitemapEntries("https://example.com", [
    {
      slug: "kitchen",
      name: "キッチン",
      searchKeywords: [],
      isActive: true,
    },
  ]);

  assert.equal(entries.length > 1, true);
  assert.equal(new Set(entries.map((entry) => entry.url)).size, entries.length);
  for (const entry of entries) {
    assert.equal("lastModified" in entry, false);
    assert.equal("changeFrequency" in entry, false);
    assert.equal("priority" in entry, false);
  }
});
