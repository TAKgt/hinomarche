import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { ProductSearchForm } from "@/components/ProductSearchForm";
import { getCategories, searchPublishedProducts } from "@/lib/db";
import { normalizeProductSearch } from "@/lib/product-search";
import { ProductFilters } from "@/components/ProductFilters";
import { parsePriceFilter, parseReviewFilter } from "@/lib/product-filters";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const { query } = normalizeProductSearch(firstValue(params.q));
  return {
    title: query ? `「${query}」の検索結果` : "商品検索",
    description: "ヒノマルシェの掲載商品を商品名・ブランド・メーカーから検索できます。",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const { query, terms } = normalizeProductSearch(firstValue(params.q));
  const priceFilter = parsePriceFilter(firstValue(params.price));
  const reviewFilter = parseReviewFilter(firstValue(params.reviews));
  const [products, categories] = await Promise.all([
    terms.length > 0
      ? searchPublishedProducts(terms, { priceFilter, reviewFilter })
      : Promise.resolve([]),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
      <nav className="mb-7 text-xs text-sumi-soft" aria-label="パンくず">
        <Link href="/" className="hover:text-hinomaru">ホーム</Link>
        <span className="mx-2">/</span>
        <span>商品検索</span>
      </nav>

      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.35em] text-hinomaru">SEARCH</p>
        <h1 className="mt-2 font-mincho text-3xl font-semibold md:text-4xl">商品を探す</h1>
        <div className="mt-6">
          <ProductSearchForm defaultValue={query} />
        </div>
      </div>

      {terms.length > 0 && (
        <ProductFilters
          action="/search"
          priceFilter={priceFilter}
          reviewFilter={reviewFilter}
          hiddenFields={{ q: query }}
          resetHref={`/search?${new URLSearchParams({ q: query }).toString()}`}
        />
      )}

      {terms.length === 0 ? (
        <section className="mt-12 border-t border-line pt-8" aria-labelledby="search-categories-heading">
          <h2 id="search-categories-heading" className="font-mincho text-xl font-semibold">
            ジャンルから探す
          </h2>
          <div className="mt-5 grid grid-cols-2 border-l border-t border-line md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="border-b border-r border-line px-4 py-3 text-sm transition-colors hover:bg-white/50 hover:text-hinomaru"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      ) : products.length === 0 ? (
        <section className="mt-12 border-t border-line py-14 text-center">
          <h2 className="font-mincho text-xl font-semibold">該当する商品がありませんでした</h2>
          <p className="mt-3 text-sm leading-relaxed text-sumi-soft">
            {priceFilter || reviewFilter
              ? "価格帯やレビュー条件を広げてお試しください。"
              : "表記を短くするか、別のキーワードでお試しください。"}
          </p>
          <Link href="/#categories" className="mt-6 inline-block text-sm text-hinomaru hover:underline">
            ジャンル一覧を見る →
          </Link>
        </section>
      ) : (
        <section className="mt-12" aria-labelledby="search-results-heading">
          <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
            <h2 id="search-results-heading" className="min-w-0 font-mincho text-xl font-semibold">
              「<span className="break-words">{query}</span>」の検索結果
            </h2>
            <p className="shrink-0 text-sm text-sumi-soft">{products.length}件</p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-sumi-soft">
            注目度とAI日本度をもとに表示しています。AI日本度は商品情報をもとにした推定です。
          </p>
          <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                surface="search"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
