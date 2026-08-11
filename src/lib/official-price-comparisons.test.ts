import assert from "node:assert/strict";
import test from "node:test";
import {
  getOfficialPriceComparison,
  OFFICIAL_PRICE_COMPARISON_MAX_AGE_DAYS,
} from "./official-price-comparisons";

const PRODUCT_ID = "7cbdf061-e26f-450a-a4b3-b3fd31ad7880";
const PRODUCT_HASH =
  "fca154ac9b81529a3564f624f2d1fba21b7bca81fe9e5ed06df18a6ff7bcbf0f";
const CHECKED_AT = new Date("2026-08-11T00:47:36.632Z");

test("確認済みの商品ハッシュではセットと単品の差額を返す", () => {
  const comparison = getOfficialPriceComparison(
    PRODUCT_ID,
    PRODUCT_HASH,
    CHECKED_AT,
  );

  assert.ok(comparison);
  assert.equal(comparison.set.price, 23_100);
  assert.equal(comparison.individualItems.length, 3);
  assert.equal(comparison.individualTotal, 24_200);
  assert.equal(comparison.difference, 1_100);
  assert.equal(comparison.differenceRatePercent, 4.5);
  assert.equal(
    comparison.individualItems.every(
      (item) =>
        item.sourceUrl.startsWith("https://global.yoshikin.co.jp/SHOP/") &&
        item.price > 0,
    ),
    true,
  );
});

test("別商品または商品内容ハッシュ不一致では表示しない", () => {
  assert.equal(
    getOfficialPriceComparison(
      "00000000-0000-4000-8000-000000000001",
      PRODUCT_HASH,
      CHECKED_AT,
    ),
    null,
  );
  assert.equal(
    getOfficialPriceComparison(PRODUCT_ID, "a".repeat(64), CHECKED_AT),
    null,
  );
  assert.equal(getOfficialPriceComparison(PRODUCT_ID, null, CHECKED_AT), null);
});

test("確認から30日を過ぎると自動的に表示しない", () => {
  const atExpiry = new Date(
    CHECKED_AT.getTime() +
      OFFICIAL_PRICE_COMPARISON_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  );
  const afterExpiry = new Date(atExpiry.getTime() + 1);

  assert.ok(getOfficialPriceComparison(PRODUCT_ID, PRODUCT_HASH, atExpiry));
  assert.equal(
    getOfficialPriceComparison(PRODUCT_ID, PRODUCT_HASH, afterExpiry),
    null,
  );
});

test("確認日時より前の時計では表示しない", () => {
  assert.equal(
    getOfficialPriceComparison(
      PRODUCT_ID,
      PRODUCT_HASH,
      new Date(CHECKED_AT.getTime() - 1),
    ),
    null,
  );
});
