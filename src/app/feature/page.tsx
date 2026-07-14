import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { FEATURES } from "@/lib/features";
import { siteOrigin } from "@/lib/site-url";

const title = "目的・商品から探す特集";
const description =
  "価格、用途、産地表示など、買いたい目的に合わせて商品を探せるヒノマルシェの特集一覧です。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/feature" },
  openGraph: { title, description, url: "/feature", type: "website" },
};

export default function FeatureIndexPage() {
  const origin = siteOrigin();
  const pageUrl = `${origin}/feature`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: origin },
        { "@type": "ListItem", position: 2, name: "特集", item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      numberOfItems: FEATURES.length,
      itemListElement: FEATURES.map((feature, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/feature/${feature.slug}`,
        name: feature.title,
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
            <span>特集</span>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">FEATURE STORIES</p>
          <h1 className="mt-3 font-mincho text-3xl font-semibold md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">{description}</p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="grid border-l border-t border-line md:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <Link
              key={feature.slug}
              href={`/feature/${feature.slug}`}
              className="group min-w-0 border-b border-r border-line px-5 py-6 transition-colors hover:bg-white/50 md:px-7"
            >
              <span className="text-xs text-hinomaru">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="mt-2 font-mincho text-xl font-semibold group-hover:text-hinomaru">
                {feature.shortTitle}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-sumi-soft">{feature.description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-sumi-soft">
          ※ AI日本度は商品情報をもとにした推定です。正確な生産国・原産地は販売ページでご確認ください。
        </p>
      </section>
    </div>
  );
}
