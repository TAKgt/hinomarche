import Link from "next/link";
import type { Product } from "@/lib/types";
import { displayProductTitle } from "@/lib/product-title";
import { productCardImageUrl } from "@/lib/product-image";
import { formatDate, formatPrice, SOURCE_LABEL } from "@/lib/format";
import { productPlacementQuery, type ProductSurface } from "@/lib/product-metrics";
import { ProductImpression } from "./ProductImpression";

export type ProductComparisonChoice = {
  label: string;
  audience: string;
  reason: string;
  product: Product;
};

function comparisonOutboundLabel(
  sourceLabel: string,
  surfaceKey: string,
  choiceLabel: string,
): string {
  if (surfaceKey === "gifts-under-5000-yen" || surfaceKey === "imabari-towel-gifts") {
    return `${sourceLabel}で送料・包装条件を見る`;
  }
  if (surfaceKey === "japanese-kitchen-knives") {
    return `${sourceLabel}で刃渡り・仕様を見る`;
  }
  if (surfaceKey === "tsubame-sanjo") {
    if (choiceLabel.includes("水切りラック")) {
      return `${sourceLabel}で設置寸法・在庫を見る`;
    }
    if (choiceLabel.includes("包丁")) {
      return `${sourceLabel}で刃渡り・仕様を見る`;
    }
    return `${sourceLabel}でサイズ・仕様を見る`;
  }
  if (surfaceKey === "imabari") {
    if (choiceLabel.includes("ふるさと納税")) {
      return `${sourceLabel}で寄付条件・発送時期を見る`;
    }
    if (choiceLabel.includes("ギフト")) {
      return `${sourceLabel}で送料・包装条件を見る`;
    }
    return `${sourceLabel}でサイズ・在庫を見る`;
  }
  return `${sourceLabel}で価格・在庫を見る`;
}

export function ProductComparison({
  choices,
  surface,
  surfaceKey,
}: {
  choices: ProductComparisonChoice[];
  surface: ProductSurface;
  surfaceKey: string;
}) {
  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-3">
      {choices.map(({ label, audience, reason, product }, index) => {
        const title = displayProductTitle(product.title);
        const placement = { surface, surfaceKey, position: index + 1 } as const;
        const query = productPlacementQuery(placement);
        const detailUrl = `/product/${product.id}?${query}`;
        const outboundUrl = `/go/${product.id}?target=primary&${query}`;
        const sourceLabel = SOURCE_LABEL[product.source];
        const outboundLabel = comparisonOutboundLabel(sourceLabel, surfaceKey, label);
        const hasReview =
          product.reviewAverage != null &&
          product.reviewAverage > 0 &&
          product.reviewAverage <= 5 &&
          product.reviewCount != null &&
          product.reviewCount > 0;

        return (
          <article key={product.id} className="relative flex h-full flex-col border border-line bg-white/65 p-4 md:p-5">
            <ProductImpression productId={product.id} placement={placement} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.16em] text-hinomaru">
                  候補 {index + 1} / {label}
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed">{audience}</p>
              </div>
              <span className="shrink-0 bg-sumi px-2 py-1 text-[10px] text-washi">{sourceLabel}</span>
            </div>

            <Link href={detailUrl} className="group mt-4 grid grid-cols-[88px_1fr] gap-4 focus-visible:outline-2 focus-visible:outline-hinomaru">
              <div className="aspect-square overflow-hidden bg-washi-deep">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 外部モール画像
                  <img
                    src={productCardImageUrl(product.imageUrl)}
                    alt={title}
                    width={176}
                    height={176}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center p-2 text-center text-xs text-sumi-soft">画像なし</span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-3 text-sm font-medium leading-snug group-hover:text-hinomaru">
                  {title}
                </h3>
                <p className="mt-2 font-mincho text-xl font-semibold">{formatPrice(product.price)}</p>
                <p className="mt-1 text-[10px] text-sumi-soft">
                  価格取得: {formatDate(product.priceUpdatedAt)}
                </p>
              </div>
            </Link>

            <dl className="mt-4 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 border-y border-line py-3 text-xs">
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

            <div className="mt-4 flex-1">
              <p className="text-xs font-medium text-sumi">この候補の選定理由</p>
              <p className="mt-1 text-xs leading-relaxed text-sumi-soft">{reason}</p>
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-sumi-soft">
                <span className="font-medium text-sumi">AI判定根拠：</span>{product.evidenceText}
              </p>
            </div>

            <Link href={detailUrl} className="mt-4 block text-center text-xs font-medium text-hinomaru hover:underline">
              AI根拠と商品情報を確認する →
            </Link>
            <a
              href={outboundUrl}
              target="_blank"
              rel="nofollow sponsored noopener"
              aria-label={`${title}を${outboundLabel}`}
              className="mt-3 block bg-hinomaru px-3 py-3.5 text-center text-sm font-medium text-white transition-colors hover:bg-hinomaru-deep"
            >
              {outboundLabel}
            </a>
          </article>
        );
      })}
    </div>
  );
}
