import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, SOURCE_LABEL } from "@/lib/format";
import { ScoreRing } from "./ScoreRing";
import { CheckMarksCompact } from "./CheckMarks";
import { displayProductTitle } from "@/lib/product-title";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const displayTitle = displayProductTitle(product.title);
  const sourceLabel = SOURCE_LABEL[product.source];
  return (
    <article
      className={`group flex h-full flex-col border border-line bg-white/60 hover:border-hinomaru hover:shadow-[0_8px_24px_rgba(34,31,26,0.08)] transition-all duration-300 rise rise-${Math.min(index % 4 + 1, 4)}`}
    >
      <Link href={`/product/${product.id}`} className="block flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hinomaru">
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
        </div>

        <div className="p-4 flex gap-3">
          <div className="shrink-0 pt-0.5">
            <ScoreRing score={product.score} size={52} />
            <p className="mt-1 text-center text-[10px] text-sumi-soft leading-tight">
              AI日本度
            </p>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-hinomaru-deep transition-colors">
              {displayTitle}
            </h3>
            <p className="mt-1.5 font-mincho text-lg font-semibold">
              {formatPrice(product.price)}
            </p>
            {product.checks && (
              <p className="mt-1">
                <CheckMarksCompact checks={product.checks} />
              </p>
            )}
            <p className="mt-1 text-xs text-sumi-soft line-clamp-2">
              {product.evidenceText}
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-auto px-4 pb-4">
        <a
          href={`/go/${product.id}?target=primary`}
          target="_blank"
          rel="nofollow sponsored noopener"
          aria-label={`${displayTitle}を${sourceLabel}で見る`}
          className="block w-full border border-sumi/25 bg-white/50 px-2 py-2.5 text-center text-xs font-medium text-sumi transition-colors hover:border-hinomaru hover:bg-hinomaru hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
        >
          {sourceLabel}で見る
        </a>
      </div>
    </article>
  );
}
