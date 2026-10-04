import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectionGuide } from "@/components/SelectionGuide";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import {
  ProductComparison,
  type ProductComparisonChoice,
} from "@/components/ProductComparison";
import { CommercialTopicNav } from "@/components/CommercialTopicNav";
import { getRegionProducts } from "@/lib/db";
import { getRegion, REGIONS } from "@/lib/regions";
import { COMMERCIAL_TOPICS } from "@/lib/commercial-topics";
import { siteOrigin } from "@/lib/site-url";
import { displayProductTitle } from "@/lib/product-title";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

type ProductHighlight = {
  label: string;
  product: Product;
};

const REVENUE_FOCUS_REGIONS = new Set(["tsubame-sanjo", "imabari"]);

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
  if (slug === "tsubame-sanjo") {
    const waterTerms = ["水切り", "ラック", "水切りかご"];
    const knifeTerms = ["包丁", "ナイフ"];
    return selectUniqueHighlights([
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
    ]);
  }

  if (slug === "imabari") {
    const giftTerms = ["ギフト", "内祝い", "お祝い", "引き出物", "木箱"];
    const isHometownTax = (product: Product) => product.title.includes("ふるさと納税");
    return selectUniqueHighlights([
      {
        label: "普段使いをレビュー件数から比較",
        candidates: products
          .filter((product) => !isHometownTax(product))
          .sort(byReviewsThenScore),
      },
      {
        label: "ギフト用途から比較",
        candidates: products
          .filter(
            (product) =>
              !isHometownTax(product) && includesAny(product.title, giftTerms),
          )
          .sort(byReviewsThenScore),
      },
      {
        label: "ふるさと納税の返礼品から比較",
        candidates: products.filter(isHometownTax).sort(byReviewsThenScore),
      },
    ]);
  }

  return [];
}

function comparisonCopy(slug: string, label: string): Pick<ProductComparisonChoice, "audience" | "reason"> {
  if (slug === "tsubame-sanjo") {
    if (label.includes("水切りラック")) {
      return {
        audience: "シンク周りの寸法と収納量から水切りラックを比べたい方",
        reason: "商品名で水切り・ラックの用途を確認できる候補から、販売先レビュー件数とAI日本度を順に確認して選定しています。",
      };
    }
    if (label.includes("包丁")) {
      return {
        audience: "燕三条表記のある家庭用包丁を5,000円以内から探したい方",
        reason: "商品名で包丁・ナイフを確認でき、取得価格が5,000円以下の候補から販売先レビュー件数を優先しています。",
      };
    }
    return {
      audience: "燕三条の調理小物を1,000円以内から試したい方",
      reason: "水切り・包丁以外の調理小物で、取得価格が1,000円以下の候補から販売先レビュー件数を優先しています。",
    };
  }

  if (label.includes("普段使い")) {
    return {
      audience: "今治表記のあるタオルを普段使いの枚数・価格から比べたい方",
      reason: "ふるさと納税を除く通常購入候補から、販売先レビュー件数とAI日本度を順に確認して選定しています。",
    };
  }
  if (label.includes("ギフト")) {
    return {
      audience: "内祝いやお祝い向けのセット・包装条件を比べたい方",
      reason: "商品名でギフト・内祝い・木箱などの用途を確認できる候補から、販売先レビュー件数を優先しています。",
    };
  }
  return {
    audience: "今治の返礼品を寄付条件とセット内容から比べたい方",
    reason: "商品名でふるさと納税を確認できる候補から、販売先レビュー件数とAI日本度を順に確認して選定しています。",
  };
}

function comparisonIntro(slug: string): { title: string; description: string } {
  if (slug === "imabari") {
    return {
      title: "普段使い・ギフト・返礼品から候補を比べる",
      description:
        "普段使い、ギフト、ふるさと納税の返礼品から1件ずつ、ページ内の候補を比較します。",
    };
  }
  if (slug === "tsubame-sanjo") {
    return {
      title: "水切りラック・包丁・調理小物を条件別に比べる",
      description:
        "水切りラック、5,000円以下の包丁、1,000円以下の調理小物から1件ずつ、ページ内の候補を比較します。",
    };
  }
  return {
    title: "用途別の比較入口",
    description:
      "ページ内の商品を用途や価格帯、販売先レビュー件数から比較できます。",
  };
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
  const isRevenueFocus = REVENUE_FOCUS_REGIONS.has(region.slug);
  const comparison = comparisonIntro(region.slug);
  const comparisonChoices = highlights.map(({ label, product }) => ({
    label,
    product,
    ...comparisonCopy(region.slug, label),
  }));
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
    <div className="collection-page">
      <JsonLd data={structuredData} />
      <header className="border-b border-line">
        <div className="collection-header mx-auto max-w-6xl px-5">
          <nav className="mb-5 text-xs text-sumi-soft" aria-label="パンくず">
            <Link href="/" className="hover:text-hinomaru">ホーム</Link>
            <span className="mx-2">/</span>
            <Link href="/region" className="hover:text-hinomaru">産地・工芸</Link>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">
            {region.eyebrow} / CRAFT &amp; ORIGIN
          </p>
          <h1 className="collection-title">
            {region.titleChunks
              ? region.titleChunks.map((chunk) => (
                  <span key={chunk} className="inline-block max-w-full">
                    {chunk}
                  </span>
                ))
              : region.title}
          </h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">
            {region.description}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-sumi-soft">
            ※ 産地・工芸名は取得時の商品名に基づきます。AI日本度は推定であり、正確な生産国・原産地は販売ページでご確認ください。
          </p>

          <nav className="collection-jump-links" aria-label="ページ内の案内">
            <a href="#products">商品を見る</a>
            {region.selectionGuide && <a href="#selection-guide">選び方を読む</a>}
            <a href="#related-regions">他の産地・工芸</a>
          </nav>
        </div>
      </header>

      <section id="products" className="collection-products mx-auto max-w-6xl px-5">
        {highlights.length > 0 && (
          <div className="mb-14">
            <div className="border-b border-line pb-4">
              <h2 className="font-mincho text-2xl font-semibold">
                {comparison.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
                {comparison.description}
              </p>
            </div>
            {isRevenueFocus ? (
              <ProductComparison choices={comparisonChoices} surface="region" surfaceKey={slug} />
            ) : (
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
            )}
          </div>
        )}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <h2 className="font-mincho text-2xl font-semibold">
            {highlights.length > 0 ? "条件に合う商品をさらに見る" : `${region.name}の商品一覧`}
          </h2>
          <p className="shrink-0 text-sm text-sumi-soft">{remainingProducts.length}件</p>
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
          <p className="py-10 text-center text-sumi-soft">
            {products.length > 0 ? "条件に合う商品は上の比較欄に掲載しています。" : "条件に合う公開商品を準備中です。"}
          </p>
        )}
      </section>

      {region.selectionGuide && (
        <SelectionGuide guide={region.selectionGuide}>
          {region.selectionGuide.relatedLink && (
            <Link href={region.selectionGuide.relatedLink.href} className="guide-related-link">
              {region.selectionGuide.relatedLink.label} →
            </Link>
          )}
        </SelectionGuide>
      )}

      {region.slug === "imabari" && (
        <section className="collection-guide">
          <div className="reading-column">
            <h2>今治タオルの返礼品は寄付額・発送時期を確認する</h2>
            <p className="guide-intro">
              返礼品カードの金額は、申込先から取得した寄付額です。
              通常販売の商品価格とは分けて比べてください。
              タオルの種類・枚数・色、発送時期、申込条件は申込先で確認します。
              ヒノマルシェに表示した取得日もあわせて確認してください。
            </p>
            <p className="guide-intro">
              今治市内在住者には返礼品が提供されません。
              今治タオルブランド認定品を探す場合は、商品ページのブランドマークや認定表示を確認します。
            </p>
            <div className="guide-sources">
              <p>参考にした公式情報</p>
              <ul>
                <li><a href="https://www.city.imabari.ehime.jp/furusato-nouzei/003/" target="_blank" rel="noopener noreferrer">今治市の寄附・返礼品案内 ↗</a></li>
                <li><a href="https://www.imabaritowel.jp/" target="_blank" rel="noopener noreferrer">今治タオルの品質基準 ↗</a></li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {region.slug === "tsubame-sanjo" && (
        <section className="collection-guide">
          <div className="reading-column">
            <h2>燕三条の産業と商品の製造地を分けて確認する</h2>
            <p className="guide-intro">
              燕三条地場産業振興センターは、燕の洋食器・金属加工と、三条の刃物・包丁を地域産業として案内しています。
              商品名に地域名があっても、個別商品の製造地や認定までは判断できません。
              正確な製造地・生産国は販売ページで確認してください。
            </p>
            <div className="guide-sources">
              <p>参考にした公式情報</p>
              <ul>
                <li><a href="https://www.tsjiba.or.jp/kankou/about/index.html" target="_blank" rel="noopener noreferrer">燕三条地場産業振興センター「物産館について」↗</a></li>
                <li><a href="https://www.tsjiba.or.jp/kankou/item/index.html" target="_blank" rel="noopener noreferrer">燕三条地場産業振興センター「包丁の種類」↗</a></li>
              </ul>
            </div>
            <h2 className="mt-10">燕三条の掲載条件と候補の選び方</h2>
            <dl className="guide-points">
              <div>
                <dt>掲載する商品</dt>
                <dd>取得時の商品名に「燕三条」「燕市」「三条市」のいずれかがあり、AI日本度80%以上で公開中の商品を表示します。価格には取得日を併記します。</dd>
              </div>
              <div>
                <dt>比較候補の選び方</dt>
                <dd>水切りラック、5,000円以下の包丁、1,000円以下の調理小物から候補を選びます。商品名と取得価格で絞り、販売先レビュー件数とAI日本度を確認しています。</dd>
              </div>
              <div>
                <dt>公式情報とAI推定の範囲</dt>
                <dd>地域産業と包丁の種類は、運営者が公式情報を確認しました。商品抽出とAI日本度には自動処理を使っています。AI日本度は製造地や原産地を保証しません。</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-sumi-soft">
              運営者による公式情報の確認日 <time dateTime="2026-08-09">2026年8月9日</time>
            </p>
          </div>
        </section>
      )}

      {isRevenueFocus && (
        <CommercialTopicNav
          topics={COMMERCIAL_TOPICS.filter(
            (topic) => topic.secondaryHref !== `/region/${region.slug}`,
          )}
          compact
          heading="用途・予算が近い特集"
        />
      )}

      <nav id="related-regions" className="collection-anchor border-y border-line" aria-label="他の産地・工芸">
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
