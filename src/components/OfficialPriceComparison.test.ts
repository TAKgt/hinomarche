import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getOfficialPriceComparison } from "@/lib/official-price-comparisons";
import { OfficialPriceComparisonSection } from "./OfficialPriceComparison";

const PRODUCT_ID = "7cbdf061-e26f-450a-a4b3-b3fd31ad7880";
const PRODUCT_HASH =
  "fca154ac9b81529a3564f624f2d1fba21b7bca81fe9e5ed06df18a6ff7bcbf0f";

test("公式価格比較を出典リンクと留保付きで表示する", () => {
  const comparison = getOfficialPriceComparison(
    PRODUCT_ID,
    PRODUCT_HASH,
    new Date("2026-08-11T00:47:36.632Z"),
  );
  assert.ok(comparison);

  const html = renderToStaticMarkup(
    createElement(OfficialPriceComparisonSection, { comparison }),
  );

  assert.match(html, /公式価格でセットと単品を比較/);
  assert.match(html, /¥23,100/);
  assert.match(html, /¥24,200/);
  assert.match(html, /¥1,100/);
  assert.match(html, /約4\.5%/);
  assert.match(html, /ポイント、送料、クーポン、在庫、名入れ/);
  assert.match(html, /https:\/\/global\.yoshikin\.co\.jp\/SHOP\/GST-B46\.html/);
  assert.match(html, /rel="noopener noreferrer"/);
});
