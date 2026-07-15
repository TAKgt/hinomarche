import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getPopularReviewedProducts } from "@/lib/db";
import { selectCategoryDiverseProducts } from "@/lib/product-selection";
import { displayProductTitle } from "@/lib/product-title";
import { siteOrigin } from "@/lib/site-url";

const title = "販売先レビューで高評価の商品";
const description =
  "販売先評価4.0以上・レビュー100件以上で、AI日本度50%以上の商品をジャンルの偏りを抑えて紹介します。";

export const revalidate = 3600;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/popular" },
  openGraph: { title, description, url: "/popular", type: "website" },
};

export default async function PopularProductsPage() {
  const candidates = await getPopularReviewedProducts(80);
  const products = selectCategoryDiverseProducts(candidates, {
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
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
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
            条件に合う商品を準備しています。
          </p>
        )}
        <p className="mt-7 text-xs leading-relaxed text-sumi-soft">
          ※ 販売先の評価・レビュー数は取得時点の情報です。AI日本度は商品情報をもとにした推定です。正確な生産国・原産地は販売ページでご確認ください。
        </p>
      </section>
    </div>
  );
}
