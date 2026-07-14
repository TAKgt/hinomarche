import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { REGIONS } from "@/lib/regions";
import { siteOrigin } from "@/lib/site-url";

const title = "産地・工芸から探す";
const description =
  "燕三条、今治、波佐見、美濃など、商品名に表記された日本の産地・工芸名から商品を探せます。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/region" },
  openGraph: { title, description, url: "/region", type: "website" },
};

export default function RegionIndexPage() {
  const origin = siteOrigin();
  const pageUrl = `${origin}/region`;
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
      numberOfItems: REGIONS.length,
      itemListElement: REGIONS.map((region, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/region/${region.slug}`,
        name: region.title,
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
            <span>産地・工芸</span>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">CRAFT &amp; ORIGIN</p>
          <h1 className="mt-3 font-mincho text-3xl font-semibold md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">{description}</p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {REGIONS.map((region) => (
            <Link
              key={region.slug}
              href={`/region/${region.slug}`}
              className="group border-b border-r border-line px-5 py-6 transition-colors hover:bg-white/50"
            >
              <span className="text-xs text-hinomaru">{region.eyebrow}</span>
              <h2 className="mt-2 font-mincho text-xl font-semibold group-hover:text-hinomaru">
                {region.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-sumi-soft">{region.description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-sumi-soft">
          ※ 産地・工芸名は取得時の商品名に基づきます。AI日本度は推定であり、正確な生産国・原産地は販売ページでご確認ください。
        </p>
      </section>
    </div>
  );
}
