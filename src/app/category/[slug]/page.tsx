import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getPublishedProductPage, type SortKey } from "@/lib/db";
import type { Tier } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { getCategoryContent } from "@/lib/category-content";
import { displayProductTitle } from "@/lib/product-title";
import { siteOrigin } from "@/lib/site-url";
import { getFeaturesForCategory } from "@/lib/features";
import { getCommercialTopicsForCategory } from "@/lib/commercial-topics";
import { ProductFilters } from "@/components/ProductFilters";
import {
  parsePriceFilter,
  parseReviewFilter,
} from "@/lib/product-filters";
import {
  buildCategoryQuery,
  categoryListingSeo,
  firstQueryValue,
  parseCategoryPage,
} from "@/lib/category-pagination";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "注目順" },
  { key: "score", label: "日本度順" },
  { key: "reviews", label: "レビュー件数順" },
  { key: "new", label: "新着順" },
  { key: "price_asc", label: "価格が安い順" },
  { key: "price_desc", label: "価格が高い順" },
];

const TIERS: { key: Tier | undefined; label: string }[] = [
  { key: undefined, label: "すべて" },
  { key: "high", label: "日本度 高 (80%〜)" },
  { key: "mid", label: "中 (50〜79%)" },
  { key: "low", label: "低 (〜49%)" },
];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return {};
  const content = getCategoryContent(slug, category.name);
  const { canonical, noindex } = categoryListingSeo(slug, query);
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: content.title,
      description: content.description,
      url: canonical,
      type: "website",
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const sortParam = firstQueryValue(query.sort);
  const tierParam = firstQueryValue(query.tier);
  const priceFilter = parsePriceFilter(firstQueryValue(query.price));
  const reviewFilter = parseReviewFilter(firstQueryValue(query.reviews));
  const requestedPage = parseCategoryPage(query.page);
  const sort: SortKey = SORTS.some((s) => s.key === sortParam)
    ? (sortParam as SortKey)
    : "featured";
  const tier: Tier | undefined = ["high", "mid", "low"].includes(tierParam ?? "")
    ? (tierParam as Tier)
    : undefined;

  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const productPage = await getPublishedProductPage({
    categorySlug: slug,
    sort,
    tier,
    priceFilter,
    reviewFilter,
    page: requestedPage,
  });
  if (requestedPage > productPage.totalPages) notFound();
  const { products, totalCount, currentPage, totalPages, pageSize } = productPage;
  const content = getCategoryContent(slug, category.name);
  const relatedFeatures = getFeaturesForCategory(slug);
  const commercialTopics = getCommercialTopicsForCategory(slug);
  const commercialFeatureHrefs = new Set(commercialTopics.map((topic) => topic.href));
  const remainingRelatedFeatures = relatedFeatures.filter(
    (feature) => !commercialFeatureHrefs.has(`/feature/${feature.slug}`),
  );
  const origin = siteOrigin();
  const pageUrl = `${origin}/category/${slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: origin },
        { "@type": "ListItem", position: 2, name: category.name, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: content.title,
      numberOfItems: totalCount,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: (currentPage - 1) * pageSize + index + 1,
        url: `${origin}/product/${product.id}`,
        name: displayProductTitle(product.title),
      })),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <JsonLd data={structuredData} />
      <nav className="mb-8 text-xs text-sumi-soft" aria-label="パンくず">
        <Link href="/" className="hover:text-hinomaru">ホーム</Link>
        <span className="mx-2">/</span>
        <span>{category.name}</span>
      </nav>
      <div className="flex items-start gap-6">
        <span
          aria-hidden
          className="hidden md:block tategaki font-mincho text-sumi-soft/50 text-sm pt-1"
        >
          にっぽんのもの
        </span>
        <div>
          <p className="text-xs tracking-[0.35em] text-hinomaru font-medium uppercase">
            Category
          </p>
          <h1 className="mt-2 font-mincho text-3xl md:text-4xl font-semibold">
            {category.name}
          </h1>
          <p className="mt-3 text-sm text-sumi-soft max-w-2xl leading-relaxed">
            {content.intro}
          </p>
          <p className="mt-3 text-xs text-sumi-soft max-w-2xl leading-relaxed">
            ※ AI日本度は商品情報をもとにした推定です。正確な生産国・原産地は販売ページでご確認ください。
          </p>
        </div>
      </div>

      {commercialTopics.length > 0 && (
        <nav className="mt-8 border-y border-line py-6" aria-label={`${category.name}の購入目的別比較`}>
          <p className="text-xs font-medium tracking-[0.25em] text-hinomaru">START WITH A PURPOSE</p>
          <h2 className="mt-2 font-mincho text-xl font-semibold">購入目的から候補を絞る</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {commercialTopics.map((topic) => (
              <div key={topic.slug} className="border border-line bg-white/50 p-4">
                <p className="font-mincho text-lg font-semibold">{topic.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-sumi-soft">{topic.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <Link href={topic.href} className="font-medium text-hinomaru hover:underline">
                    {topic.linkLabel} →
                  </Link>
                  {topic.secondaryHref && topic.secondaryLabel && (
                    <Link href={topic.secondaryHref} className="text-sumi-soft hover:text-hinomaru">
                      {topic.secondaryLabel} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </nav>
      )}

      {remainingRelatedFeatures.length > 0 && (
        <nav className="mt-8" aria-label={`${category.name}の関連特集`}>
          <p className="text-xs font-medium tracking-[0.25em] text-hinomaru">RELATED FEATURES</p>
          <div className="mt-3 grid border-l border-t border-line sm:grid-cols-2">
            {remainingRelatedFeatures.map((feature) => (
              <Link
                key={feature.slug}
                href={`/feature/${feature.slug}`}
                className="border-b border-r border-line px-4 py-3 text-sm transition-colors hover:bg-white/50 hover:text-hinomaru"
              >
                {feature.shortTitle}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <div className="mt-8 space-y-4 md:space-y-3 border-b border-line pb-4">
        <div className="md:flex md:items-center md:gap-2">
          <span className="block md:w-16 text-xs text-sumi-soft mb-1.5 md:mb-0">
            並び順
          </span>
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 pb-1 md:pb-0">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={`/category/${slug}${buildCategoryQuery({
                  sort: s.key,
                  tier,
                  priceFilter,
                  reviewFilter,
                })}`}
                className={`shrink-0 whitespace-nowrap px-4 py-1.5 text-sm border transition-colors ${
                  sort === s.key
                    ? "bg-sumi text-washi border-sumi"
                    : "border-line text-sumi-soft hover:border-sumi hover:text-sumi"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="md:flex md:items-center md:gap-2">
          <span className="block md:w-16 text-xs text-sumi-soft mb-1.5 md:mb-0">
            日本度
          </span>
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 pb-1 md:pb-0">
            {TIERS.map((t) => (
              <Link
                key={t.key ?? "all"}
                href={`/category/${slug}${buildCategoryQuery({
                  sort,
                  tier: t.key,
                  priceFilter,
                  reviewFilter,
                })}`}
                className={`shrink-0 whitespace-nowrap px-4 py-1.5 text-sm border transition-colors ${
                  tier === t.key
                    ? "bg-hinomaru text-white border-hinomaru"
                    : "border-line text-sumi-soft hover:border-hinomaru hover:text-hinomaru"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ProductFilters
        action={`/category/${slug}`}
        priceFilter={priceFilter}
        reviewFilter={reviewFilter}
        hiddenFields={{
          ...(sort !== "featured" ? { sort } : {}),
          ...(tier ? { tier } : {}),
        }}
        resetHref={`/category/${slug}${buildCategoryQuery({ sort, tier })}`}
      />

      {products.length === 0 ? (
        <div className="py-20 text-center text-sumi-soft">
          <p>
            {priceFilter || reviewFilter
              ? "条件に合う商品がありませんでした。"
              : "このカテゴリの商品はまだ掲載されていません。"}
          </p>
          {(priceFilter || reviewFilter) && (
            <Link
              href={`/category/${slug}${buildCategoryQuery({ sort, tier })}`}
              className="mt-5 inline-block text-sm text-hinomaru hover:underline"
            >
              条件を解除する →
            </Link>
          )}
        </div>
      ) : (
        <section className="mt-8" aria-labelledby="category-products-heading">
          <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
            <h2 id="category-products-heading" className="font-mincho text-xl font-semibold">
              掲載商品
            </h2>
            <p className="text-right text-sm text-sumi-soft">
              全{totalCount}件・{currentPage}/{totalPages}ページ
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {products.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                surface="category"
                surfaceKey={slug}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <nav
              className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6"
              aria-label={`${category.name}の商品ページ`}
            >
              {currentPage > 1 ? (
                <Link
                  href={`/category/${slug}${buildCategoryQuery({
                    sort,
                    tier,
                    priceFilter,
                    reviewFilter,
                    page: currentPage - 1,
                  })}`}
                  rel="prev"
                  className="inline-flex min-h-11 min-w-24 items-center justify-center border border-line px-4 py-2 text-sm text-sumi transition-colors hover:border-hinomaru hover:text-hinomaru focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
                >
                  ← 前へ
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-11 min-w-24 items-center justify-center border border-line/60 px-4 py-2 text-sm text-sumi-soft/50"
                >
                  ← 前へ
                </span>
              )}
              <span aria-current="page" className="shrink-0 text-sm text-sumi-soft">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={`/category/${slug}${buildCategoryQuery({
                    sort,
                    tier,
                    priceFilter,
                    reviewFilter,
                    page: currentPage + 1,
                  })}`}
                  rel="next"
                  className="inline-flex min-h-11 min-w-24 items-center justify-center border border-line px-4 py-2 text-sm text-sumi transition-colors hover:border-hinomaru hover:text-hinomaru focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
                >
                  次へ →
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-11 min-w-24 items-center justify-center border border-line/60 px-4 py-2 text-sm text-sumi-soft/50"
                >
                  次へ →
                </span>
              )}
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
