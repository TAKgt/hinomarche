import type { SortKey } from "./db";
import type { PriceFilterKey, ReviewFilterKey } from "./product-filters";
import type { Tier } from "./types";

export const CATEGORY_PAGE_SIZE = 60;

type QueryValue = string | string[] | undefined;

export type CategoryQuery = Record<string, QueryValue>;

export function firstQueryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validPageNumber(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const parsed = Number(raw);
  const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / CATEGORY_PAGE_SIZE);
  return Number.isSafeInteger(parsed) && parsed <= maxPage ? parsed : null;
}

export function parseCategoryPage(value: QueryValue): number {
  const raw = firstQueryValue(value);
  if (!raw) return 1;
  return validPageNumber(raw) ?? 1;
}

export function buildCategoryQuery({
  sort,
  tier,
  priceFilter,
  reviewFilter,
  page = 1,
}: {
  sort: SortKey;
  tier?: Tier;
  priceFilter?: PriceFilterKey;
  reviewFilter?: ReviewFilterKey;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (sort !== "featured") params.set("sort", sort);
  if (tier) params.set("tier", tier);
  if (priceFilter) params.set("price", priceFilter);
  if (reviewFilter) params.set("reviews", reviewFilter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

const FILTER_QUERY_KEYS = ["sort", "tier", "price", "reviews"] as const;

/** 絞り込みURLだけをクロール対象から外し、カテゴリ本体と通常ページ送りは維持する。 */
export function listingFilterLinkRel(href: string): "nofollow" | undefined {
  const queryStart = href.indexOf("?");
  if (queryStart === -1) return undefined;
  const hashStart = href.indexOf("#", queryStart);
  const query = href.slice(
    queryStart + 1,
    hashStart === -1 ? undefined : hashStart,
  );
  const params = new URLSearchParams(query);
  return FILTER_QUERY_KEYS.some((key) => params.has(key))
    ? "nofollow"
    : undefined;
}

export function categoryListingSeo(
  slug: string,
  query: CategoryQuery,
): {
  canonical: string;
  noindex: boolean;
} {
  const basePath = `/category/${slug}`;
  const rawPage = query.page;
  const page = parseCategoryPage(rawPage);
  const hasOnlyPageQuery = Object.entries(query).every(
    ([key, value]) => value === undefined || key === "page",
  );
  const hasValidSinglePage =
    rawPage === undefined ||
    (typeof rawPage === "string" && validPageNumber(rawPage) !== null);
  const normalPagination = hasOnlyPageQuery && hasValidSinglePage;

  return {
    canonical:
      normalPagination && page > 1 ? `${basePath}?page=${page}` : basePath,
    noindex: !normalPagination,
  };
}
