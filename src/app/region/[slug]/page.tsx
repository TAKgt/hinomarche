import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getRegionProducts } from "@/lib/db";
import { getRegion, REGIONS } from "@/lib/regions";
import { siteOrigin } from "@/lib/site-url";
import { displayProductTitle } from "@/lib/product-title";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

type ProductHighlight = {
  label: string;
  product: Product;
};

function includesAny(title: string, terms: string[]): boolean {
  return terms.some((term) => title.includes(term));
}

function byReviewsThenScore(a: Product, b: Product): number {
  return (
    (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
    (b.reviewAverage ?? 0) - (a.reviewAverage ?? 0) ||
    b.score - a.score
  );
}

function getProductHighlights(slug: string, products: Product[]): ProductHighlight[] {
  if (slug !== "tsubame-sanjo") return [];

  const waterTerms = ["水切り", "ラック", "水切りかご"];
  const knifeTerms = ["包丁", "ナイフ"];
  const selected = new Set<string>();
  const strategies = [
    {
      label: "水切りラックをレビュー件数から比較",
      candidates: products
        .filter((product) => includesAny(product.title, waterTerms))
        .sort(byReviewsThenScore),
    },
    {
      label: "5,000円以下の包丁を比較",
      candidates: products
        .filter(
          (product) =>
            includesAny(product.title, knifeTerms) &&
            product.price != null &&
            product.price <= 5000,
        )
        .sort(byReviewsThenScore),
    },
    {
      label: "1,000円以下の調理小物を比較",
      candidates: products
        .filter(
          (product) =>
            !includesAny(product.title, waterTerms) &&
            !includesAny(product.title, knifeTerms) &&
            product.price != null &&
            product.price <= 1000,
        )
        .sort(byReviewsThenScore),
    },
  ];

  return strategies.flatMap(({ label, candidates }) => {
    const product = candidates.find((candidate) => !selected.has(candidate.id));
    if (!product) return [];
    selected.add(product.id);
    return [{ label, product }];
  });
}

export function generateStaticParams() {
  return REGIONS.map((region) => ({ slug: region.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegion(slug);
  if (!region) return {};
  return {
    title: region.title,
    description: region.description,
    alternates: { canonical: `/region/${region.slug}` },
    openGraph: {
      title: region.title,
      description: region.description,
      url: `/region/${region.slug}`,
      type: "website",
    },
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = getRegion(slug);
  if (!region) notFound();

  const products = await getRegionProducts({
    titleTerms: region.titleTerms,
    minScore: region.minScore,
  });
  const highlights = getProductHighlights(region.slug, products);
  const highlightedIds = new Set(highlights.map(({ product }) => product.id));
  const remainingProducts = products.filter((product) => !highlightedIds.has(product.id));
  const displayProducts = [
    ...highlights.map(({ product }) => product),
    ...remainingProducts,
  ];
  const origin = siteOrigin();
  const pageUrl = `${origin}/region/${region.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: origin },
        { "@type": "ListItem", position: 2, name: region.name, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: region.title,
      numberOfItems: products.length,
      itemListElement: displayProducts.map((product, index) => ({
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
            <Link href="/region" className="hover:text-hinomaru">産地・工芸</Link>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">
            {region.eyebrow} / CRAFT &amp; ORIGIN
          </p>
          <h1 className="mt-3 max-w-4xl font-mincho text-3xl font-semibold leading-snug md:text-5xl">
            {region.title}
          </h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">
            {region.description}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-sumi-soft">
            ※ 産地・工芸名は取得時の商品名に基づきます。AI日本度は推定であり、正確な生産国・原産地は販売ページでご確認ください。
          </p>
        </div>
      </header>

      {region.selectionGuide && (
        <section className="border-b border-line bg-washi-deep/35">
          <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
            <h2 className="font-mincho text-2xl font-semibold md:text-3xl">
              {region.selectionGuide.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sumi-soft md:text-base">
              {region.selectionGuide.description}
            </p>
            <ol className="mt-7 grid gap-4 md:grid-cols-3">
              {region.selectionGuide.points.map((point, index) => (
                <li key={point.title} className="border border-line bg-white/60 p-5">
                  <p className="text-xs font-medium tracking-[0.18em] text-hinomaru">
                    POINT {index + 1}
                  </p>
                  <h3 className="mt-2 font-mincho text-lg font-semibold">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
                    {point.description}
                  </p>
                </li>
              ))}
            </ol>
            {region.selectionGuide.relatedLink && (
              <Link
                href={region.selectionGuide.relatedLink.href}
                className="mt-6 inline-flex border-b border-hinomaru pb-1 text-sm font-medium text-hinomaru transition-colors hover:text-hinomaru-deep"
              >
                {region.selectionGuide.relatedLink.label} →
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        {highlights.length > 0 && (
          <div className="mb-14">
            <div className="border-b border-line pb-4">
              <h2 className="font-mincho text-2xl font-semibold">用途別の比較入口</h2>
              <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
                水切りラック、包丁、手頃な調理小物から候補を確認できます。
              </p>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {highlights.map(({ label, product }, index) => (
                <div key={product.id} className="flex flex-col">
                  <p className="mb-2 border-l-2 border-hinomaru pl-3 text-sm font-medium">
                    {label}
                  </p>
                  <ProductCard
                    product={product}
                    index={index}
                    surface="region"
                    surfaceKey={slug}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <h2 className="font-mincho text-2xl font-semibold">
            {highlights.length > 0 ? "条件に合う商品をさらに見る" : "注目商品"}
          </h2>
          <p className="text-sm text-sumi-soft">{products.length}件</p>
        </div>
        {remainingProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {remainingProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index + highlights.length}
                surface="region"
                surfaceKey={slug}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sumi-soft">条件に合う公開商品を準備中です。</p>
        )}
      </section>

      <nav className="border-y border-line bg-washi-deep/40" aria-label="他の産地・工芸">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {REGIONS.filter((item) => item.slug !== region.slug).map((item) => (
            <Link
              key={item.slug}
              href={`/region/${item.slug}`}
              className="border-b border-r border-line px-4 py-5 transition-colors hover:bg-white/50"
            >
              <span className="text-xs text-hinomaru">他の産地</span>
              <span className="mt-1 block font-mincho font-semibold">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
