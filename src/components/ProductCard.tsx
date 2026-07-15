import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, SOURCE_LABEL } from "@/lib/format";
import { ScoreRing } from "./ScoreRing";
import { CheckMarksCompact } from "./CheckMarks";
import { displayProductTitle } from "@/lib/product-title";
import { ProductImpression } from "./ProductImpression";
import {
  productPlacementQuery,
  type ProductPlacement,
  type ProductSurface,
} from "@/lib/product-metrics";

export function ProductCard({
  product,
  index = 0,
  surface,
  surfaceKey = null,
}: {
  product: Product;
  index?: number;
  surface: ProductSurface;
  surfaceKey?: string | null;
}) {
  const displayTitle = displayProductTitle(product.title);
  const sourceLabel = SOURCE_LABEL[product.source];
  const placement: ProductPlacement = {
    surface,
    surfaceKey,
    position: index + 1,
  };
  const outboundUrl = `/go/${product.id}?target=primary&${productPlacementQuery(placement)}`;
  const detailUrl = `/product/${product.id}?${productPlacementQuery(placement)}`;
  const hasReview =
    product.reviewAverage != null &&
    product.reviewAverage > 0 &&
    product.reviewAverage <= 5 &&
    product.reviewCount != null &&
    product.reviewCount > 0;
  return (
    <article
      className={`group flex h-full flex-col border border-line bg-white/60 hover:border-hinomaru hover:shadow-[0_8px_24px_rgba(34,31,26,0.08)] transition-all duration-300 rise rise-${Math.min(index % 4 + 1, 4)}`}
    >
      <ProductImpression productId={product.id} placement={placement} />
      <Link href={detailUrl} className="block flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hinomaru">
        <div className="relative aspect-square overflow-hidden bg-washi-deep">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- 外部モール画像はドメインが多岐に渡るためimgで表示
            <img
              src={product.imageUrl}
              alt={displayTitle}
              loading="lazy"
              className="size-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="size-full flex items-center justify-center p-6">
              <span className="tategaki font-mincho text-sumi-soft/70 text-sm max-h-full overflow-hidden">
                {displayTitle.slice(0, 12)}
              </span>
            </div>
          )}
          <span className="absolute left-0 top-3 bg-sumi text-washi text-[11px] tracking-wider px-2.5 py-1">
            {sourceLabel}
          </span>
          <div className="absolute bottom-2 right-2 md:hidden">
            <ScoreRing score={product.score} size={44} />
          </div>
        </div>

        <div className="p-3 md:flex md:gap-3 md:p-4">
          <div className="hidden shrink-0 pt-0.5 md:block">
            <ScoreRing score={product.score} size={52} />
            <p className="mt-1 text-center text-[10px] text-sumi-soft leading-tight">
              AI日本度
            </p>
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-3 text-[13px] font-medium leading-snug transition-colors group-hover:text-hinomaru-deep md:line-clamp-2 md:text-sm">
              {displayTitle}
            </h3>
            <p className="mt-2 font-mincho text-lg font-semibold md:mt-1.5">
              {formatPrice(product.price)}
            </p>
            {hasReview && (
              <p
                className="mt-1 text-[11px] leading-tight text-sumi-soft"
                aria-label={`販売先レビュー ${product.reviewAverage?.toFixed(1)}、${product.reviewCount?.toLocaleString("ja-JP")}件`}
              >
                <span className="text-hinomaru" aria-hidden>★</span>{" "}
                {product.reviewAverage?.toFixed(1)}
                <span className="ml-1">({product.reviewCount?.toLocaleString("ja-JP")}件)</span>
              </p>
            )}
            {product.checks && (
              <p className="mt-1 hidden md:block">
                <CheckMarksCompact checks={product.checks} />
              </p>
            )}
            <p className="mt-2 line-clamp-3 border-t border-line/70 pt-2 text-[11px] leading-relaxed text-sumi-soft md:mt-1 md:line-clamp-2 md:border-0 md:pt-0 md:text-xs">
              {product.evidenceText}
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-auto px-3 pb-3 md:px-4 md:pb-4">
        <a
          href={outboundUrl}
          target="_blank"
          rel="nofollow sponsored noopener"
          aria-label={`${displayTitle}を${sourceLabel}で見る`}
          className="block w-full border border-sumi/25 bg-white/50 px-2 py-3 text-center text-xs font-medium text-sumi transition-colors hover:border-hinomaru hover:bg-hinomaru hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru md:py-2.5"
        >
          {sourceLabel}で見る
        </a>
      </div>
    </article>
  );
}
