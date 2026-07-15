import Link from "next/link";
import {
  PRICE_FILTERS,
  REVIEW_FILTERS,
  type PriceFilterKey,
  type ReviewFilterKey,
} from "@/lib/product-filters";

export function ProductFilters({
  action,
  priceFilter,
  reviewFilter,
  hiddenFields = {},
  resetHref,
  showReviewFilter = true,
}: {
  action: string;
  priceFilter?: PriceFilterKey;
  reviewFilter?: ReviewFilterKey;
  hiddenFields?: Record<string, string>;
  resetHref: string;
  showReviewFilter?: boolean;
}) {
  const hasFilters = Boolean(priceFilter || reviewFilter);

  return (
    <form
      action={action}
      method="get"
      className={`mt-5 grid gap-3 border-y border-line py-4 sm:items-end ${
        showReviewFilter
          ? "sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          : "sm:grid-cols-[minmax(0,1fr)_auto]"
      }`}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label className="block min-w-0">
        <span className="mb-1.5 block text-xs text-sumi-soft">価格帯</span>
        <select
          name="price"
          defaultValue={priceFilter ?? ""}
          className="h-11 w-full border border-line bg-white/65 px-3 text-sm text-sumi outline-none focus:border-hinomaru focus:ring-1 focus:ring-hinomaru"
        >
          {PRICE_FILTERS.map((filter) => (
            <option key={filter.key || "all"} value={filter.key}>{filter.label}</option>
          ))}
        </select>
      </label>
      {showReviewFilter && (
        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs text-sumi-soft">販売先レビュー</span>
          <select
            name="reviews"
            defaultValue={reviewFilter ?? ""}
            className="h-11 w-full border border-line bg-white/65 px-3 text-sm text-sumi outline-none focus:border-hinomaru focus:ring-1 focus:ring-hinomaru"
          >
            {REVIEW_FILTERS.map((filter) => (
              <option key={filter.key || "all"} value={filter.key}>{filter.label}</option>
            ))}
          </select>
        </label>
      )}
      <div className={`flex gap-3 ${showReviewFilter ? "sm:col-span-2 lg:col-span-1" : ""}`}>
        <button
          type="submit"
          className="h-11 flex-1 border border-sumi bg-sumi px-5 text-sm font-medium text-washi transition-colors hover:border-hinomaru hover:bg-hinomaru focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
        >
          絞り込む
        </button>
        {hasFilters && (
          <Link
            href={resetHref}
            className="flex h-11 items-center justify-center border border-line px-4 text-sm text-sumi-soft transition-colors hover:border-sumi hover:text-sumi"
          >
            条件を解除
          </Link>
        )}
      </div>
    </form>
  );
}
