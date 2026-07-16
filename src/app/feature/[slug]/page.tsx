import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getFeatureProducts } from "@/lib/db";
import { FEATURES, getFeature, getRelatedFeatures } from "@/lib/features";
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

function selectUniqueHighlights(
  strategies: { label: string; candidates: Product[] }[],
): ProductHighlight[] {
  const selected = new Set<string>();
  return strategies.flatMap(({ label, candidates }) => {
    const product = candidates.find((candidate) => !selected.has(candidate.id));
    if (!product) return [];
    selected.add(product.id);
    return [{ label, product }];
  });
}

function getProductHighlights(slug: string, products: Product[]): ProductHighlight[] {
  if (slug === "gifts-under-5000-yen") {
    return selectUniqueHighlights([
      {
        label: "1,500円以下から比較",
        candidates: products
          .filter((product) => product.price != null && product.price <= 1500)
          .sort(byReviewsThenScore),
      },
      {
        label: "1,501〜3,000円から比較",
        candidates: products
          .filter(
            (product) =>
              product.price != null && product.price > 1500 && product.price <= 3000,
          )
          .sort(byReviewsThenScore),
      },
      {
        label: "3,001〜5,000円から比較",
        candidates: products
          .filter(
            (product) =>
              product.price != null && product.price > 3000 && product.price <= 5000,
          )
          .sort(byReviewsThenScore),
      },
    ]);
  }

  if (slug === "imabari-towel-gifts") {
    const formalGiftTerms = [
      "内祝い",
      "お返し",
      "ご挨拶",
      "引き出物",
      "結婚祝い",
      "出産祝い",
      "快気祝い",
      "香典返し",
    ];
    const hasFormalGiftUse = (product: Product) =>
      includesAny(product.title, formalGiftTerms);
    return selectUniqueHighlights([
      {
        label: "内祝い・お礼向け（1,000円以下）",
        candidates: products
          .filter(
            (product) =>
              hasFormalGiftUse(product) &&
              product.price != null &&
              product.price <= 1000,
          )
          .sort(byReviewsThenScore),
      },
      {
        label: "バス・フェイスタオルの組み合わせ",
        candidates: products
          .filter(
            (product) =>
              product.title.includes("バス") && product.title.includes("フェイス"),
          )
          .sort(byReviewsThenScore),
      },
      {
        label: "自宅用セットをレビュー件数から比較",
        candidates: products
          .filter(
            (product) =>
              !hasFormalGiftUse(product) &&
              product.title.includes("セット") &&
              product.price != null &&
              product.price <= 5000,
          )
          .sort(byReviewsThenScore),
      },
    ]);
  }

  if (slug !== "japanese-kitchen-knives") return [];

  const strategies = [
    {
      label: "販売先レビュー件数から比較",
      candidates: [...products].sort(
        (a, b) =>
          (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
          (b.reviewAverage ?? 0) - (a.reviewAverage ?? 0),
      ),
    },
    {
      label: "5,000円以下から比較",
      candidates: products
        .filter((product) => product.price != null && product.price <= 5000)
        .sort(
          (a, b) =>
            (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
            (b.reviewAverage ?? 0) - (a.reviewAverage ?? 0),
        ),
    },
    {
      label: "AI日本度から比較",
      candidates: [...products].sort(
        (a, b) => b.score - a.score || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
      ),
    },
  ];

  return selectUniqueHighlights(strategies);
}

function highlightDescription(slug: string): string {
  if (slug === "gifts-under-5000-yen") {
    return "贈る相手や場面に合わせて、3つの価格帯から候補を確認できます。";
  }
  if (slug === "imabari-towel-gifts") {
    return "内祝い・お礼、セット内容、自宅用の異なる基準から候補を確認できます。";
  }
  return "販売先レビュー件数、価格帯、AI日本度の異なる基準から候補を確認できます。";
}

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
  const highlights = getProductHighlights(feature.slug, products);
  const highlightedIds = new Set(highlights.map(({ product }) => product.id));
  const remainingProducts = products.filter((product) => !highlightedIds.has(product.id));
  const displayProducts = [
    ...highlights.map(({ product }) => product),
    ...remainingProducts,
  ];
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

      {feature.selectionGuide && (
        <section className="border-b border-line bg-washi-deep/35">
          <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
            <h2 className="font-mincho text-2xl font-semibold md:text-3xl">
              {feature.selectionGuide.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sumi-soft md:text-base">
              {feature.selectionGuide.description}
            </p>
            <ol className="mt-7 grid gap-4 md:grid-cols-3">
              {feature.selectionGuide.points.map((point, index) => (
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
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        {highlights.length > 0 && (
          <div className="mb-14">
            <div className="border-b border-line pb-4">
              <h2 className="font-mincho text-2xl font-semibold">比較の入口</h2>
              <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
                {highlightDescription(feature.slug)}
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
                    surface="feature"
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
