import Link from "next/link";
import { formatDate, formatPrice, SOURCE_LABEL } from "@/lib/format";
import { productFeatureImageUrl } from "@/lib/product-image";
import { productPlacementQuery } from "@/lib/product-metrics";
import { displayProductTitle } from "@/lib/product-title";
import type { Product } from "@/lib/types";
import { ProductImpression } from "./ProductImpression";

export function GiftProductHero({
  product,
  surfaceKey,
}: {
  product: Product;
  surfaceKey: string;
}) {
  const title = displayProductTitle(product.title);
  const sourceLabel = SOURCE_LABEL[product.source];
  const placement = { surface: "feature", surfaceKey, position: 1 } as const;
  const query = productPlacementQuery(placement);
  const detailUrl = `/product/${product.id}?${query}`;
  const outboundUrl = `/go/${product.id}?target=primary&${query}`;
  const hasReview =
    product.reviewAverage != null &&
    product.reviewAverage > 0 &&
    product.reviewAverage <= 5 &&
    product.reviewCount != null &&
    product.reviewCount > 0;

  return (
    <section className="border-b border-line" aria-labelledby="gift-pick-heading">
      <article className="grid bg-white lg:min-h-[42rem] lg:grid-cols-2">
        <ProductImpression productId={product.id} placement={placement} />
        <Link
          href={detailUrl}
          className="group flex min-h-[24rem] items-center justify-center overflow-hidden bg-[#fafafa] p-5 focus-visible:outline-2 focus-visible:outline-hinomaru sm:min-h-[32rem] md:p-10 lg:min-h-full"
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- 外部モール画像
            <img
              src={productFeatureImageUrl(product.imageUrl)}
              alt={title}
              width={800}
              height={800}
              decoding="async"
              className="h-auto max-h-[38rem] w-full max-w-[42rem] object-contain transition-transform duration-500 group-hover:scale-[1.025]"
            />
          ) : (
            <span className="text-sm text-sumi-soft">画像なし</span>
          )}
        </Link>

        <div className="flex items-center px-5 py-10 sm:px-10 md:py-14 lg:px-14 xl:px-20">
          <div className="w-full max-w-xl">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium tracking-[0.24em] text-hinomaru">
                GIFT PICK
              </p>
              <span className="bg-sumi px-2.5 py-1 text-[11px] text-white">
                {sourceLabel}
              </span>
            </div>
            <h2
              id="gift-pick-heading"
              className="mt-6 font-mincho text-2xl font-semibold leading-relaxed sm:text-3xl lg:text-4xl"
            >
              {title}
            </h2>
            <p className="mt-6 font-mincho text-3xl font-semibold sm:text-4xl">
              {formatPrice(product.price)}
            </p>
            <p className="mt-2 text-xs text-sumi-soft">
              価格取得: {formatDate(product.priceUpdatedAt)}
            </p>

            <dl className="mt-7 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 border-y border-line py-5 text-sm">
              <dt className="text-sumi-soft">販売先レビュー</dt>
              <dd className="font-medium">
                {hasReview
                  ? `★ ${product.reviewAverage?.toFixed(1)}（${product.reviewCount?.toLocaleString("ja-JP")}件）`
                  : "レビュー情報なし"}
              </dd>
              <dt className="text-sumi-soft">AI日本度</dt>
              <dd className="font-medium">{product.score}%（AI推定）</dd>
              <dt className="text-sumi-soft">確認根拠</dt>
              <dd className="font-medium">{product.evidenceType}</dd>
            </dl>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href={detailUrl}
                className="border border-sumi/35 px-5 py-4 text-center text-sm font-medium transition-colors hover:border-hinomaru hover:text-hinomaru"
              >
                AI根拠と商品情報を見る
              </Link>
              <a
                href={outboundUrl}
                target="_blank"
                rel="nofollow sponsored noopener"
                aria-label={`${title}を${sourceLabel}で確認する`}
                className="bg-hinomaru px-5 py-4 text-center text-sm font-medium text-white transition-colors hover:bg-hinomaru-deep"
              >
                {sourceLabel}で送料・包装条件を見る
              </a>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-sumi-soft">
              ※ AI日本度は商品情報をもとにした推定です。価格・在庫・生産国・包装条件は販売ページでご確認ください。
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
