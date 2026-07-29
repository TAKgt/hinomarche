import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { GiftProductHero } from "@/components/GiftProductHero";
import {
  ProductComparison,
  type ProductComparisonChoice,
} from "@/components/ProductComparison";
import { CommercialTopicNav } from "@/components/CommercialTopicNav";
import { getFeatureProducts } from "@/lib/db";
import { FEATURES, getFeature, getRelatedFeatures } from "@/lib/features";
import { COMMERCIAL_TOPICS } from "@/lib/commercial-topics";
import { siteOrigin } from "@/lib/site-url";
import { displayProductTitle } from "@/lib/product-title";
import { selectCategoryDiverseProducts } from "@/lib/product-selection";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

type ProductHighlight = {
  label: string;
  product: Product;
};

const REVENUE_FOCUS_FEATURES = new Set([
  "japanese-gift-ideas",
  "japanese-kitchen-knives",
  "imabari-towel-gifts",
  "gifts-under-5000-yen",
]);

const PRODUCT_COMPARISON_FEATURES = new Set([
  ...REVENUE_FOCUS_FEATURES,
  "rice-cookers",
  "japanese-green-tea",
]);

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
  if (slug === "rice-cookers") {
    const cookingPotTerms = [
      "ご飯釜",
      "ごはん釜",
      "ご飯鍋",
      "ごはん鍋",
      "炊飯土鍋",
      "炊飯鍋",
    ];
    const electricTerms = ["IH炊飯器", "IHジャー", "炊飯ジャー"];
    const isCookingPot = (product: Product) =>
      includesAny(product.title, cookingPotTerms) &&
      !includesAny(product.title, electricTerms);

    return selectUniqueHighlights([
      {
        label: "電気炊飯器・炊飯ジャーから比較",
        candidates: products.filter((product) => !isCookingPot(product)),
      },
      {
        label: "3合の炊飯鍋から比較",
        candidates: products
          .filter(
            (product) => isCookingPot(product) && product.title.includes("3合"),
          ),
      },
      {
        label: "5合の炊飯鍋から比較",
        candidates: products
          .filter(
            (product) => isCookingPot(product) && product.title.includes("5合"),
          ),
      },
    ]);
  }

  if (slug === "japanese-gift-ideas") {
    return selectUniqueHighlights([
      {
        label: "販売先レビュー件数から選ぶ贈りもの",
        candidates: [...products].sort(byReviewsThenScore),
      },
    ]);
  }

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

  if (slug === "japanese-green-tea") {
    const teaBagTerms = ["ティーバッグ", "ティーパック"];
    const powderTerms = ["粉末", "パウダー"];
    return selectUniqueHighlights([
      {
        label: "ティーバッグをレビュー件数から比較",
        candidates: products
          .filter((product) => includesAny(product.title, teaBagTerms))
          .sort(byReviewsThenScore),
      },
      {
        label: "粉末タイプをレビュー件数から比較",
        candidates: products
          .filter((product) => includesAny(product.title, powderTerms))
          .sort(byReviewsThenScore),
      },
      {
        label: "茶葉タイプをレビュー件数から比較",
        candidates: products
          .filter(
            (product) =>
              includesAny(product.title, ["茶葉", "煎茶"]) &&
              !includesAny(product.title, teaBagTerms) &&
              !includesAny(product.title, powderTerms),
          )
          .sort(byReviewsThenScore),
      },
    ]);
  }

  if (slug === "regional-japanese-rice") {
    const isHometownTax = (product: Product) => product.title.includes("ふるさと納税");
    return selectUniqueHighlights([
      {
        label: "通常購入をレビュー件数から比較",
        candidates: products.filter((product) => !isHometownTax(product)).sort(byReviewsThenScore),
      },
      {
        label: "無洗米をレビュー件数から比較",
        candidates: products
          .filter((product) => product.title.includes("無洗米"))
          .sort(byReviewsThenScore),
      },
      {
        label: "ふるさと納税の返礼品から比較",
        candidates: products.filter(isHometownTax).sort(byReviewsThenScore),
      },
    ]);
  }

  if (slug === "iron-frying-pans") {
    const eggPanTerms = ["卵焼", "玉子焼", "たまご焼", "エッグパン"];
    return selectUniqueHighlights([
      {
        label: "焼き物向けをレビュー件数から比較",
        candidates: products
          .filter((product) => !includesAny(product.title, eggPanTerms))
          .sort(byReviewsThenScore),
      },
      {
        label: "手入れのしやすさに関する表示から比較",
        candidates: products
          .filter(
            (product) =>
              !includesAny(product.title, eggPanTerms) &&
              includesAny(product.title, [
                "油ならし不要",
                "お手入れ簡単",
                "錆びにくい",
                "焦げにくい",
              ]),
          )
          .sort(byReviewsThenScore),
      },
      {
        label: "卵焼き器から比較",
        candidates: products
          .filter((product) => includesAny(product.title, eggPanTerms))
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
  if (slug === "rice-cookers") {
    return "電気炊飯器、3合表記のある炊飯鍋、5合表記のある炊飯鍋から候補を確認できます。";
  }
  if (slug === "japanese-gift-ideas") {
    return "販売先レビュー、食べもの・飲みもの、タオル・日用品の異なる入口から候補を確認できます。";
  }
  if (slug === "gifts-under-5000-yen") {
    return "贈る相手や場面に合わせて、3つの価格帯から候補を確認できます。";
  }
  if (slug === "imabari-towel-gifts") {
    return "内祝い・お礼、セット内容、自宅用の異なる基準から候補を確認できます。";
  }
  if (slug === "japanese-green-tea") {
    return "ティーバッグ、粉末、茶葉の異なる形から候補を確認できます。";
  }
  if (slug === "regional-japanese-rice") {
    return "通常購入、無洗米、ふるさと納税の異なる条件から候補を確認できます。";
  }
  if (slug === "iron-frying-pans") {
    return "焼き物向け、手入れに関する表示、卵焼き器の用途別に候補を確認できます。";
  }
  return "販売先レビュー件数、価格帯、AI日本度の異なる基準から候補を確認できます。";
}

function comparisonCopy(slug: string, label: string): Pick<ProductComparisonChoice, "audience" | "reason"> {
  if (slug === "rice-cookers") {
    if (label.includes("電気炊飯器")) {
      return {
        audience: "電気炊飯器を容量や加熱方式から比べたい方",
        reason: "商品名から電気炊飯器または炊飯ジャーと判断できる商品のうち、ページ内の既存順で最初の候補を選定しています。",
      };
    }
    if (label.includes("3合")) {
      return {
        audience: "3合表記のある炊飯鍋を比べたい方",
        reason: "商品名で炊飯鍋と3合の表記を確認できる商品のうち、ページ内の既存順で最初の候補を選定しています。",
      };
    }
    return {
      audience: "5合表記のある炊飯鍋を比べたい方",
      reason: "商品名で炊飯鍋と5合の表記を確認できる商品のうち、ページ内の既存順で最初の候補を選定しています。",
    };
  }

  if (slug === "japanese-green-tea") {
    if (label.includes("ティーバッグ")) {
      return {
        audience: "ティーバッグの個数や抽出方法を比べたい方",
        reason: "商品名にティーバッグまたはティーパックの表記がある候補から、販売先レビュー件数、評価、AI日本度の順で確認しています。",
      };
    }
    if (label.includes("粉末")) {
      return {
        audience: "粉末タイプの名称や内容量を比べたい方",
        reason: "商品名に粉末またはパウダーの表記がある候補から、販売先レビュー件数、評価、AI日本度の順で確認しています。",
      };
    }
    return {
      audience: "急須などで淹れる茶葉タイプを比べたい方",
      reason: "商品名に茶葉または煎茶の表記があり、ティーバッグ・粉末表記のない候補から、販売先レビュー件数、評価、AI日本度の順で確認しています。",
    };
  }

  if (slug === "japanese-gift-ideas") {
    if (label.includes("食べもの・飲みもの")) {
      return {
        audience: "食べたり飲んだりして楽しめる贈りものを探したい方",
        reason: "商品名から食品・飲料に関する表記を確認できる候補を、販売先レビュー件数とAI日本度の順で確認しています。",
      };
    }
    if (label.includes("タオル・日用品")) {
      return {
        audience: "暮らしの中で使いやすい贈りものを探したい方",
        reason: "商品名からタオル・日用品に関する表記を確認できる候補を、販売先レビュー件数とAI日本度の順で確認しています。",
      };
    }
    return {
      audience: "販売先レビューの蓄積を入口に贈りものを探したい方",
      reason: "ページ内候補を販売先レビュー件数、評価、AI日本度の順で確認して選定しています。",
    };
  }

  if (slug === "gifts-under-5000-yen") {
    if (label.includes("1,500円以下")) {
      return {
        audience: "気軽なお礼や手土産を低めの予算から探したい方",
        reason: "取得価格が1,500円以下の候補から、販売先レビュー件数とAI日本度を順に確認して選定しています。",
      };
    }
    if (label.includes("1,501〜3,000円")) {
      return {
        audience: "内祝いや季節のご挨拶を3,000円以内で探したい方",
        reason: "取得価格が1,501〜3,000円の候補から、販売先レビュー件数とAI日本度を順に確認して選定しています。",
      };
    }
    return {
      audience: "内容量や見栄えも含めて5,000円以内で比べたい方",
      reason: "取得価格が3,001〜5,000円の候補から、販売先レビュー件数とAI日本度を順に確認して選定しています。",
    };
  }

  if (slug === "imabari-towel-gifts") {
    if (label.includes("内祝い・お礼")) {
      return {
        audience: "ご挨拶や小さなお礼に使うタオルを探したい方",
        reason: "商品名で内祝い・お礼などの用途を確認でき、取得価格が1,000円以下の候補から選定しています。",
      };
    }
    if (label.includes("組み合わせ")) {
      return {
        audience: "バスタオルとフェイスタオルを組み合わせて贈りたい方",
        reason: "商品名でバスタオルとフェイスタオルの両方を確認できる候補から、販売先レビュー件数を優先しています。",
      };
    }
    return {
      audience: "包装より枚数や普段使いを重視してセットを選びたい方",
      reason: "通常購入できる5,000円以下のセット候補から、販売先レビュー件数とAI日本度を順に確認して選定しています。",
    };
  }

  if (label.includes("レビュー件数")) {
    return {
      audience: "販売先レビューの蓄積を比較の入口にしたい方",
      reason: "ページ内候補を販売先レビュー件数、評価、AI日本度の順で確認して選定しています。",
    };
  }
  if (label.includes("5,000円以下")) {
    return {
      audience: "初めての家庭用包丁を5,000円以内から探したい方",
      reason: "取得価格が5,000円以下の候補から、販売先レビュー件数と評価を順に確認して選定しています。",
    };
  }
  return {
    audience: "商品情報にある産地・企業の根拠を重視したい方",
    reason: "AI日本度と販売先レビュー件数を順に確認し、判定根拠を商品詳細で確認できる候補を選定しています。",
  };
}

function comparisonHeading(slug: string): string {
  if (slug === "rice-cookers") {
    return "電気炊飯器・3合鍋・5合鍋から候補を比べる";
  }
  if (slug === "japanese-green-tea") {
    return "ティーバッグ・粉末・茶葉から候補を比べる";
  }
  return "比較の入口";
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

  const productCandidates = await getFeatureProducts({
    categorySlugs: feature.categorySlugs,
    minScore: feature.minScore,
    maxPrice: feature.maxPrice,
    titleTermGroups: feature.titleTermGroups,
    excludeTitleTerms: feature.excludeTitleTerms,
    limit: feature.slug === "japanese-gift-ideas" ? 80 : 24,
  });
  const products = feature.slug === "japanese-gift-ideas"
    ? selectCategoryDiverseProducts(productCandidates, { limit: 24, maxPerCategory: 4 })
    : productCandidates;
  const isGiftLanding = feature.slug === "japanese-gift-ideas";
  const relatedFeatures = getRelatedFeatures(feature);
  const highlights = getProductHighlights(feature.slug, products);
  const isRevenueFocus = REVENUE_FOCUS_FEATURES.has(feature.slug);
  const usesProductComparison = PRODUCT_COMPARISON_FEATURES.has(feature.slug);
  const comparisonChoices = highlights.map(({ label, product }) => ({
    label,
    product,
    ...comparisonCopy(feature.slug, label),
  }));
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
        <div className={`mx-auto max-w-6xl px-5 ${isGiftLanding ? "py-7 md:py-9" : "py-12 md:py-16"}`}>
          <nav className={`${isGiftLanding ? "mb-5" : "mb-8"} text-xs text-sumi-soft`} aria-label="パンくず">
            <Link href="/" className="hover:text-hinomaru">ホーム</Link>
            <span className="mx-2">/</span>
            <Link href="/feature" className="hover:text-hinomaru">特集</Link>
          </nav>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">
            {feature.eyebrow}
          </p>
          <h1
            className={`mt-3 max-w-4xl font-mincho text-3xl font-semibold leading-snug md:text-5xl ${
              feature.slug === "rice-cookers" ? "text-balance" : ""
            }`}
          >
            {feature.title}
          </h1>
          {!isGiftLanding && (
            <>
              <p className="mt-5 max-w-3xl leading-relaxed text-sumi-soft">
                {feature.description}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-sumi-soft">
                ※ AI日本度は商品情報をもとにした推定です。正確な生産国・原産地は販売ページでご確認ください。
              </p>
            </>
          )}
        </div>
      </header>

      {isGiftLanding && highlights[0] && (
        <GiftProductHero product={highlights[0].product} surfaceKey={slug} />
      )}

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
            {feature.selectionGuide.officialLinks &&
              feature.selectionGuide.officialLinks.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-sumi-soft">
                  <span>公式情報:</span>
                  {feature.selectionGuide.officialLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-hinomaru hover:underline"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        {!isGiftLanding && highlights.length > 0 && (
          <div className="mb-14">
            <div className="border-b border-line pb-4">
              <h2 className="font-mincho text-2xl font-semibold">
                {comparisonHeading(feature.slug)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
                {highlightDescription(feature.slug)}
              </p>
            </div>
            {usesProductComparison ? (
              <ProductComparison choices={comparisonChoices} surface="feature" surfaceKey={slug} />
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
                      surface="feature"
                      surfaceKey={slug}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <h2 className="font-mincho text-2xl font-semibold">
            {isGiftLanding
              ? "ほかの贈りものを見る"
              : highlights.length > 0
                ? "条件に合う商品をさらに見る"
                : "注目商品"}
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

      {isRevenueFocus && (
        <CommercialTopicNav
          topics={COMMERCIAL_TOPICS.filter((topic) => topic.href !== `/feature/${feature.slug}`)}
          heading="次の購入目的も続けて比較"
          description="商品を広く探し直さず、予算や用途が近い別テーマへ移動できます。"
        />
      )}

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
