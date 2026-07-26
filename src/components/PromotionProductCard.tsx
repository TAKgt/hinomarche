import { ProductCard } from "./ProductCard";
import { promotionLabels } from "@/lib/product-promotions";
import type { Product } from "@/lib/types";

function formatPromotionFetchedAt(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function PromotionProductCard({
  product,
  index,
  now,
}: {
  product: Product;
  index: number;
  now: Date;
}) {
  const labels = promotionLabels(product, now);
  const fetchedAt = formatPromotionFetchedAt(product.promotionFetchedAt);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex min-h-12 flex-wrap content-end items-center gap-1.5">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex bg-hinomaru px-2 py-1 text-[10px] font-medium text-white sm:text-xs"
          >
            {label}
          </span>
        ))}
        {fetchedAt && (
          <span className="w-full text-[10px] text-sumi-soft">
            商品情報 {fetchedAt}取得
          </span>
        )}
      </div>
      <ProductCard product={product} index={index} surface="deals" />
    </div>
  );
}
