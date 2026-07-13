import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getProduct, getRelatedProducts } from "@/lib/db";
import { formatDate, formatPrice, SOURCE_LABEL } from "@/lib/format";
import { ScoreRing } from "@/components/ScoreRing";
import { CheckMarks } from "@/components/CheckMarks";
import { ProductViewTracker } from "@/components/ProductViewTracker";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { productStructuredData } from "@/lib/structured-data";
import { TIER_LABEL } from "@/lib/types";
import { displayProductTitle } from "@/lib/product-title";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return {};
  const displayTitle = displayProductTitle(product.title);
  return {
    title: displayTitle,
    description: `${displayTitle} — AI日本度判定 ${product.score}%。${product.evidenceText}`,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      title: displayTitle,
      description: `${displayTitle} — AI日本度判定 ${product.score}%。${product.evidenceText}`,
      url: `/product/${product.id}`,
      type: "website",
      images: product.imageUrl ? [{ url: product.imageUrl, alt: displayTitle }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const [relatedProducts, categories] = await Promise.all([
    getRelatedProducts(product),
    getCategories(),
  ]);
  const categoryName =
    categories.find((category) => category.slug === product.categorySlug)?.name ??
    "商品カテゴリ";
  const displayTitle = displayProductTitle(product.title);

  const isRakuten = product.source === "rakuten";
  const buttonLabel = isRakuten ? "楽天市場で見る" : "Amazonで見る";
  const crossLabel = isRakuten ? "Amazonで探す" : "楽天市場で探す";
  const primaryUrl = `/go/${product.id}?target=primary`;
  const crossUrl = `/go/${product.id}?target=cross`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <JsonLd data={productStructuredData(product, categoryName)} />
      <ProductViewTracker productId={product.id} />
      <nav className="text-xs text-sumi-soft mb-8">
        <Link href="/" className="hover:text-hinomaru">ホーム</Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${product.categorySlug}`} className="hover:text-hinomaru">
          {categoryName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-sumi">{displayTitle.slice(0, 24)}…</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        {/* 画像 */}
        <div className="relative aspect-square bg-washi-deep border border-line flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- 外部モール画像
            <img
              src={product.imageUrl}
              alt={displayTitle}
              className="size-full object-contain"
            />
          ) : (
            <span className="tategaki font-mincho text-2xl text-sumi-soft/60 max-h-[80%] overflow-hidden">
              {displayTitle.slice(0, 14)}
            </span>
          )}
          <span className="absolute left-0 top-4 bg-sumi text-washi text-xs tracking-wider px-3 py-1.5">
            {SOURCE_LABEL[product.source]}
          </span>
        </div>

        {/* 情報 */}
        <div>
          <h1 className="font-mincho text-2xl md:text-3xl font-semibold leading-snug">
            {displayTitle}
          </h1>

          {(product.brand || product.maker) && (
            <p className="mt-2 text-sm text-sumi-soft">
              {[product.brand, product.maker].filter(Boolean).join(" / ")}
            </p>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-mincho text-3xl font-semibold">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-sumi-soft">
              {formatDate(product.priceUpdatedAt)}
            </span>
          </div>

          {/* AI判定カード */}
          <div className="mt-7 border border-line bg-white/60 p-5">
            <div className="flex items-center gap-5">
              <ScoreRing score={product.score} size={84} />
              <div>
                <p className="text-xs tracking-[0.25em] text-hinomaru font-medium">
                  AI日本度判定
                </p>
                <p className="mt-1 font-mincho text-xl font-semibold">
                  {TIER_LABEL[product.tier]}
                  <span className="ml-2 text-sm font-normal text-sumi-soft">
                    根拠: {product.evidenceType}
                  </span>
                </p>
              </div>
            </div>
            {product.checks && (
              <div className="mt-4 border-t border-line pt-4">
                <CheckMarks checks={product.checks} />
              </div>
            )}
            <p className="mt-4 text-sm leading-relaxed border-t border-line pt-4">
              {product.evidenceText}
            </p>
            <p className="mt-3 text-xs text-sumi-soft leading-relaxed">
              ※ このスコアはAIによる推定であり、実際の生産国・原産地を保証するものでは
              ありません。正確な情報は販売ページでご確認ください。
            </p>
          </div>

          <a
            href={primaryUrl}
            target="_blank"
            rel="nofollow sponsored noopener"
            className={`mt-7 block text-center text-white px-8 py-4 text-sm tracking-[0.2em] font-medium transition-colors ${
              isRakuten
                ? "bg-hinomaru hover:bg-hinomaru-deep shadow-[0_4px_16px_rgba(188,0,45,0.3)]"
                : "bg-sumi hover:bg-black shadow-[0_4px_16px_rgba(34,31,26,0.3)]"
            }`}
          >
            {buttonLabel}
          </a>
          <a
            href={crossUrl}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="mt-3 block text-center border border-sumi/25 text-sumi px-8 py-3.5 text-sm tracking-[0.2em] font-medium hover:border-sumi hover:bg-white/50 transition-colors"
          >
            {crossLabel}
          </a>
          <p className="mt-2 text-center text-[11px] text-sumi-soft">
            外部の販売ページに移動します(アフィリエイトリンク)。
            「{crossLabel}」は商品名での検索結果ページに移動します(同一商品とは限りません)
          </p>
        </div>
      </div>

      {/* 説明文 */}
      {product.description && (
        <section className="mt-14 max-w-3xl">
          <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
            商品について
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sumi-soft whitespace-pre-line">
            {product.description}
          </p>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">
            RELATED
          </p>
          <h2 className="mt-2 font-mincho text-2xl font-semibold">
            関連する日本度の高い商品
          </h2>
          <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {relatedProducts.map((related, index) => (
              <ProductCard key={related.id} product={related} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
