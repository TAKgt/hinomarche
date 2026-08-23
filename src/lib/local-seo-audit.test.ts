import assert from "node:assert/strict";
import test from "node:test";
import {
  extractSitemapLocations,
  inspectRenderedSeoHtml,
  isCategoryPaginationPath,
} from "./local-seo-audit";

test("sitemapからURLを復元する", () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.com/</loc></url>
    <url><loc>https://example.com/category/a?page=2&amp;view=list</loc></url>
  </urlset>`;

  assert.deepEqual(extractSitemapLocations(xml), [
    "https://example.com/",
    "https://example.com/category/a?page=2&view=list",
  ]);
});

test("HTMLからmetadata・リンク規則・JSON-LD・画像・404導線を検査できる", () => {
  const inspection = inspectRenderedSeoHtml(
    `<html><head>
      <title>テスト &amp; 確認</title>
      <meta name="description" content="説明文です" />
      <link rel="canonical" href="https://example.com/category/a" />
      <meta name="robots" content="index,follow" />
      <script type="application/ld+json">[{"@type":"Product","offers":{"@type":"Offer"}},{"@type":"BreadcrumbList"}]</script>
    </head><body>
      <h1>見出し</h1>
      <a href="/product/example?surface=category&amp;position=1">旧商品リンク</a>
      <a href="/product/clean#surface=category&amp;position=2">新商品リンク</a>
      <a href="/category/a?sort=new">nofollowなし</a>
      <a href="/category/a?tier=high" rel="nofollow">nofollowあり</a>
      <a href="https://outside.example/item">外部</a>
      <img data-product-hero="" loading="eager" fetchPriority="high" decoding="async" />
      <img data-product-surface="related" loading="lazy" />
      <section data-product-merchant-summary="" data-nosnippet="">
        <p data-product-merchant-summary-text="">販売元説明の抜粋</p>
      </section>
      <section data-not-found-search=""><form action="/search" role="search"></form></section>
      <nav data-not-found-recovery="">
        <a href="/#categories">ジャンル</a><a href="/feature">特集</a>
        <a href="/popular">人気</a><a href="/region">産地</a><a href="/">トップ</a>
      </nav>
    </body></html>`,
    "http://127.0.0.1:3210/category/a",
    ["https://example.com"],
  );

  assert.equal(inspection.title, "テスト & 確認");
  assert.equal(inspection.description, "説明文です");
  assert.equal(inspection.h1Count, 1);
  assert.equal(inspection.noindex, false);
  assert.equal(inspection.canonicalPath, "/category/a");
  assert.ok(inspection.internalPaths.includes("/product/clean"));
  assert.equal(inspection.productTrackingQueryLinkCount, 1);
  assert.equal(inspection.filterLinkWithoutNofollowCount, 1);
  assert.deepEqual(inspection.jsonLdTypes, [
    "BreadcrumbList",
    "Offer",
    "Product",
  ]);
  assert.equal(inspection.jsonLdParseErrors, 0);
  assert.equal(inspection.productHeroImageCount, 1);
  assert.equal(inspection.productHeroPriorityInvalid, 0);
  assert.equal(inspection.relatedProductImageCount, 1);
  assert.equal(inspection.relatedProductImageLazyInvalid, 0);
  assert.equal(inspection.productMerchantSummaryCount, 1);
  assert.equal(inspection.productMerchantSummaryNosnippetInvalid, 0);
  assert.equal(inspection.productMerchantSummaryTextOverLimit, 0);
  assert.equal(inspection.hasNotFoundSearch, true);
  assert.equal(inspection.hasNotFoundRecoveryNavigation, true);
  assert.equal(inspection.notFoundRecoveryLinkCount, 5);
});

test("欠落・壊れたJSON-LD・画像属性不備を件数で返す", () => {
  const longMerchantSummary = "説".repeat(601);
  const inspection = inspectRenderedSeoHtml(
    `<html><head><script type="application/ld+json">{broken</script></head><body>
      <img data-product-hero="" loading="lazy" />
      <img data-product-surface="related" loading="eager" />
      <span data-product-hero-placeholder=""></span>
      <section data-product-merchant-summary="">
        <p data-product-merchant-summary-text="">${longMerchantSummary}</p>
      </section>
    </body></html>`,
    "http://127.0.0.1:3210/product/example",
    [],
  );

  assert.equal(inspection.title, null);
  assert.equal(inspection.description, null);
  assert.equal(inspection.jsonLdParseErrors, 1);
  assert.equal(inspection.productHeroPriorityInvalid, 1);
  assert.equal(inspection.relatedProductImageLazyInvalid, 1);
  assert.equal(inspection.productHeroPlaceholderCount, 1);
  assert.equal(inspection.productMerchantSummaryNosnippetInvalid, 1);
  assert.equal(inspection.productMerchantSummaryTextOverLimit, 1);
});

test("カテゴリの自己canonicalページ送りだけを追加巡回対象にする", () => {
  assert.equal(isCategoryPaginationPath("/category/a?page=2"), true);
  assert.equal(isCategoryPaginationPath("/category/a?page=1"), false);
  assert.equal(isCategoryPaginationPath("/category/a?page=2&sort=new"), false);
  assert.equal(isCategoryPaginationPath("/search?page=2"), false);
});
