import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getRegionProducts } from "@/lib/db";
import { getRegion, REGIONS } from "@/lib/regions";
import { siteOrigin } from "@/lib/site-url";
import { displayProductTitle } from "@/lib/product-title";

type Props = { params: Promise<{ slug: string }> };

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

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <h2 className="font-mincho text-2xl font-semibold">注目商品</h2>
          <p className="text-sm text-sumi-soft">{products.length}件</p>
        </div>
        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
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
