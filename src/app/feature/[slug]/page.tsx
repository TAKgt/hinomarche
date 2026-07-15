import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getFeatureProducts } from "@/lib/db";
import { FEATURES, getFeature, getRelatedFeatures } from "@/lib/features";
import { siteOrigin } from "@/lib/site-url";
import { displayProductTitle } from "@/lib/product-title";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return FEATURES.map((feature) => ({ slug: feature.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return {};
  return {
    title: feature.title,
    description: feature.description,
    alternates: { canonical: `/feature/${feature.slug}` },
    openGraph: {
      title: feature.title,
      description: feature.description,
      url: `/feature/${feature.slug}`,
      type: "website",
    },
  };
}

export default async function FeaturePage({ params }: Props) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();

  const products = await getFeatureProducts({
    categorySlugs: feature.categorySlugs,
    minScore: feature.minScore,
    maxPrice: feature.maxPrice,
    titleTermGroups: feature.titleTermGroups,
    excludeTitleTerms: feature.excludeTitleTerms,
  });
  const relatedFeatures = getRelatedFeatures(feature);
  const origin = siteOrigin();
  const pageUrl = `${origin}/feature/${feature.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: origin },
        { "@type": "ListItem", position: 2, name: feature.title, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: feature.title,
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
            <Link href="/feature" className="hover:text-hinomaru">特集</Link>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">
            {feature.eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl font-mincho text-3xl font-semibold leading-snug md:text-5xl">
            {feature.title}
          </h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">
            {feature.description}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-sumi-soft">
            ※ AI日本度は商品情報をもとにした推定です。正確な生産国・原産地は販売ページでご確認ください。
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
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                surface="feature"
                surfaceKey={slug}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sumi-soft">条件に合う公開商品を準備中です。</p>
        )}
      </section>

      <nav className="border-y border-line bg-washi-deep/40" aria-label="他の特集">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2 lg:grid-cols-4">
          {relatedFeatures.map((item) => (
            <Link
              key={item.slug}
              href={`/feature/${item.slug}`}
              className="border-b border-r border-line px-5 py-6 transition-colors hover:bg-white/50"
            >
              <span className="text-xs text-hinomaru">他の特集</span>
              <span className="mt-1 block font-mincho text-lg font-semibold">{item.shortTitle}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
