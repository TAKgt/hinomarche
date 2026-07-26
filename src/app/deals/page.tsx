import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PromotionProductCard } from "@/components/PromotionProductCard";
import { getDealProducts } from "@/lib/db";
import {
  productsForPromotion,
  PROMOTION_FRESHNESS_HOURS,
} from "@/lib/product-promotions";
import { selectCategoryDiverseProducts } from "@/lib/product-selection";
import { displayProductTitle } from "@/lib/product-title";
import { siteOrigin } from "@/lib/site-url";
import type { Product } from "@/lib/types";

const title = "楽天のセール・送料無料・ポイントアップ商品";
const description =
  "楽天市場の商品情報から、開催中のセール、送料無料対象、商品別ポイントアップをまとめて紹介します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/deals" },
  openGraph: { title, description, url: "/deals", type: "website" },
};

export const revalidate = 3600;

function timeValue(value: string | null | undefined): number {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function featuredValue(product: Product): number {
  return product.featuredScore ?? 0;
}

function sectionProducts(
  products: Product[],
  kind: "sale" | "postage" | "points",
  now: Date,
): Product[] {
  const matches = productsForPromotion(products, kind, now);
  matches.sort((a, b) => {
    if (kind === "sale") {
      return (
        timeValue(a.saleEndAt) - timeValue(b.saleEndAt) ||
        featuredValue(b) - featuredValue(a)
      );
    }
    if (kind === "points") {
      return (
        (b.pointRate ?? 0) - (a.pointRate ?? 0) ||
        timeValue(a.pointRateEndAt) - timeValue(b.pointRateEndAt) ||
        featuredValue(b) - featuredValue(a)
      );
    }
    return featuredValue(b) - featuredValue(a);
  });
  return selectCategoryDiverseProducts(matches, {
    limit: 12,
    maxPerCategory: 3,
  });
}

export default async function DealsPage() {
  const now = new Date();
  const candidates = await getDealProducts(300, now);
  const sections = [
    {
      id: "sale",
      title: "開催中の期間限定セール",
      description:
        "楽天市場の商品情報にセールの開始・終了日時が設定され、現在その期間内にある商品です。",
      products: sectionProducts(candidates, "sale", now),
    },
    {
      id: "postage",
      title: "送料無料の対象商品",
      description:
        "楽天市場の商品情報で、送料込みまたは送料無料の対象として取得した商品です。地域や購入条件は販売ページでご確認ください。",
      products: sectionProducts(candidates, "postage", now),
    },
    {
      id: "points",
      title: "商品別ポイントアップ",
      description:
        "商品ごとに設定されたポイント倍率と実施期間を確認できる商品です。ショップ全体や楽天市場全体のキャンペーンは含みません。",
      products: sectionProducts(candidates, "points", now),
    },
  ] as const;

  const uniqueProducts = new Map<string, Product>();
  for (const section of sections) {
    for (const product of section.products) uniqueProducts.set(product.id, product);
  }

  const origin = siteOrigin();
  const pageUrl = `${origin}/deals`;
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
      numberOfItems: uniqueProducts.size,
      itemListElement: [...uniqueProducts.values()].map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/product/${product.id}`,
        name: displayProductTitle(product.title),
      })),
    },
  ];

  let placementOffset = 0;

  return (
    <div>
      <JsonLd data={structuredData} />
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <nav className="mb-8 text-xs text-sumi-soft" aria-label="パンくず">
            <Link href="/" className="hover:text-hinomaru">ホーム</Link>
            <span className="mx-2">/</span>
            <span>セール・特典</span>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">
            LIMITED OFFERS
          </p>
          <h1 className="mt-3 max-w-4xl font-mincho text-3xl font-semibold md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">
            {description}
            商品情報は取得から{PROMOTION_FRESHNESS_HOURS}時間以内のものに限定し、
            終了日時を過ぎたセールやポイントアップは表示しません。
          </p>
          <nav className="mt-7 flex flex-wrap gap-2 text-sm" aria-label="掲載条件">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="border border-line bg-white/60 px-4 py-2 transition-colors hover:border-hinomaru hover:text-hinomaru"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {sections.map((section) => {
        const startIndex = placementOffset;
        placementOffset += section.products.length;
        return (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-28 border-b border-line last:border-b-0"
          >
            <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
              <div className="max-w-3xl">
                <div className="flex items-end justify-between gap-4">
                  <h2 className="font-mincho text-2xl font-semibold md:text-3xl">
                    {section.title}
                  </h2>
                  <p className="shrink-0 text-sm text-sumi-soft">
                    {section.products.length}件
                  </p>
                </div>
                <p className="mt-4 leading-relaxed text-sumi-soft">
                  {section.description}
                </p>
              </div>

              {section.products.length > 0 ? (
                <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                  {section.products.map((product, index) => (
                    <PromotionProductCard
                      key={product.id}
                      product={product}
                      index={startIndex + index}
                      now={now}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-8 border-y border-line py-10 text-center text-sm text-sumi-soft">
                  現在、取得条件を満たす商品はありません。
                </p>
              )}
            </div>
          </section>
        );
      })}

      <aside className="mx-auto max-w-6xl px-5 py-10 text-xs leading-relaxed text-sumi-soft">
        <p>
          ※ 価格、在庫、送料、ポイント倍率、実施期間は取得時点の情報です。
          配送地域、会員条件、購入数量などによって適用条件が変わる場合があります。
          購入前に楽天市場の商品ページで最新情報をご確認ください。
        </p>
        <p className="mt-2">
          ※ 商品別ポイントアップは、終了まで24時間以内になると楽天市場APIから取得できない場合があります。
          AI日本度は商品情報をもとにした推定です。
        </p>
      </aside>
    </div>
  );
}
