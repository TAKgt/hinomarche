import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getPublishedProducts, type SortKey } from "@/lib/db";
import type { Tier } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { getCategoryContent } from "@/lib/category-content";
import { displayProductTitle } from "@/lib/product-title";
import { siteOrigin } from "@/lib/site-url";
import { getFeaturesForCategory } from "@/lib/features";
import { ProductFilters } from "@/components/ProductFilters";
import {
  parsePriceFilter,
  parseReviewFilter,
  type PriceFilterKey,
  type ReviewFilterKey,
} from "@/lib/product-filters";

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

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildQuery(
  sort: SortKey,
  tier: Tier | undefined,
  priceFilter?: PriceFilterKey,
  reviewFilter?: ReviewFilterKey,
): string {
  const params = new URLSearchParams();
  if (sort !== "featured") params.set("sort", sort);
  if (tier) params.set("tier", tier);
  if (priceFilter) params.set("price", priceFilter);
  if (reviewFilter) params.set("reviews", reviewFilter);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return {};
  const content = getCategoryContent(slug, category.name);
  const canonical = `/category/${slug}`;
  const isListingVariant = Object.values(query).some((value) => value !== undefined);
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical },
    robots: isListingVariant ? { index: false, follow: true } : undefined,
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
  const sortParam = firstValue(query.sort);
  const tierParam = firstValue(query.tier);
  const priceFilter = parsePriceFilter(firstValue(query.price));
  const reviewFilter = parseReviewFilter(firstValue(query.reviews));
  const sort: SortKey = SORTS.some((s) => s.key === sortParam)
    ? (sortParam as SortKey)
    : "featured";
  const tier: Tier | undefined = ["high", "mid", "low"].includes(tierParam ?? "")
    ? (tierParam as Tier)
    : undefined;

  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const products = await getPublishedProducts({
    categorySlug: slug,
    sort,
    tier,
    priceFilter,
    reviewFilter,
  });
  const content = getCategoryContent(slug, category.name);
  const relatedFeatures = getFeaturesForCategory(slug);
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
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
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

      {relatedFeatures.length > 0 && (
        <nav className="mt-8" aria-label={`${category.name}の関連特集`}>
          <p className="text-xs font-medium tracking-[0.25em] text-hinomaru">RELATED FEATURES</p>
          <div className="mt-3 grid border-l border-t border-line sm:grid-cols-2">
            {relatedFeatures.map((feature) => (
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
                href={`/category/${slug}${buildQuery(s.key, tier, priceFilter, reviewFilter)}`}
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
                href={`/category/${slug}${buildQuery(sort, t.key, priceFilter, reviewFilter)}`}
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
        resetHref={`/category/${slug}${buildQuery(sort, tier)}`}
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
              href={`/category/${slug}${buildQuery(sort, tier)}`}
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
            <p className="text-sm text-sumi-soft">表示中 {products.length}件</p>
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
        </section>
      )}
    </div>
  );
}
