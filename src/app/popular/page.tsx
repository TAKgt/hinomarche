import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { getPopularReviewedProducts } from "@/lib/db";
import { selectCategoryDiverseProducts } from "@/lib/product-selection";
import { displayProductTitle } from "@/lib/product-title";
import { siteOrigin } from "@/lib/site-url";
import { matchesShoppingFilters, parsePriceFilter } from "@/lib/product-filters";

const title = "販売先レビューで高評価の商品";
const description =
  "販売先評価4.0以上・レビュー100件以上で、AI日本度50%以上の商品をジャンルの偏りを抑えて紹介します。";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams;
  const isFiltered = Object.values(query).some((value) => value !== undefined);
  return {
    title,
    description,
    alternates: { canonical: "/popular" },
    robots: isFiltered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: "/popular", type: "website" },
  };
}

export default async function PopularProductsPage({ searchParams }: Props) {
  const query = await searchParams;
  const priceFilter = parsePriceFilter(firstValue(query.price));
  const candidates = await getPopularReviewedProducts(200);
  const filteredCandidates = candidates.filter((product) =>
    matchesShoppingFilters(product, priceFilter),
  );
  const products = selectCategoryDiverseProducts(filteredCandidates, {
    limit: 40,
    maxPerCategory: 4,
  });
  const origin = siteOrigin();
  const pageUrl = `${origin}/popular`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: origin },
        { "@type": "ListItem", position: 2, name: title, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
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
    <div>
      <JsonLd data={structuredData} />
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <nav className="mb-8 text-xs text-sumi-soft" aria-label="パンくず">
            <Link href="/" className="hover:text-hinomaru">ホーム</Link>
            <span className="mx-2">/</span>
            <span>高評価商品</span>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">HIGHLY REVIEWED</p>
          <h1 className="mt-3 font-mincho text-3xl font-semibold md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">{description}</p>
          <dl className="mt-7 grid max-w-3xl grid-cols-3 border-l border-t border-line text-center">
            {[
              ["販売先評価", "4.0以上"],
              ["レビュー", "100件以上"],
              ["AI日本度", "50%以上"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-r border-line px-2 py-4">
                <dt className="text-[11px] text-sumi-soft sm:text-xs">{label}</dt>
                <dd className="mt-1 font-mincho text-base font-semibold sm:text-xl">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-mincho text-xl font-semibold">掲載商品</h2>
          <p className="text-sm text-sumi-soft">表示中 {products.length}件</p>
        </div>
        <ProductFilters
          action="/popular"
          priceFilter={priceFilter}
          resetHref="/popular"
          showReviewFilter={false}
        />
        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                surface="popular"
              />
            ))}
          </div>
        ) : (
          <p className="border-y border-line py-12 text-center text-sm text-sumi-soft">
            条件に合う商品がありませんでした。
          </p>
        )}
        <p className="mt-7 text-xs leading-relaxed text-sumi-soft">
          ※ 販売先の評価・レビュー数は取得時点の情報です。AI日本度は商品情報をもとにした推定です。正確な生産国・原産地は販売ページでご確認ください。
        </p>
      </section>
    </div>
  );
}
