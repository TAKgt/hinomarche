import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type {
  Category,
  Judgment,
  Product,
  ProductPageData,
  RawProduct,
  Tier,
} from "./types";
import { calculateDemandScore, calculateFeaturedScore } from "./market";
import type { CategoryInventory } from "./ingest-plan";
import { FEATURES, matchesFeatureProduct } from "./features";
import { matchesRegionProduct, REGIONS } from "./regions";
import { calculateCollectionRanking } from "./collection-ranking";
import type { ProductPlacement } from "./product-metrics";
import { matchesProductSearch } from "./product-search";
import {
  matchesShoppingFilters,
  type PriceFilterKey,
  type ReviewFilterKey,
} from "./product-filters";
import {
  detectJudgmentConsistencyIssues,
  judgmentInputHash,
  planProductRefresh,
  refreshedProductFields,
} from "./product-freshness";
import { CATEGORY_PAGE_SIZE } from "./category-pagination";
import { readAllPages } from "./read-all-pages";
import { hasActivePromotion } from "./product-promotions";
import demoProducts from "../data/demo-products.json";

/**
 * データアクセス層。
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていればSupabaseを使い、
 * 未設定ならデモデータ(src/data/demo-products.json)で動作する。
 * 公開ページの読み取りは SUPABASE_ANON_KEY でRLSを効かせる。
 */

export function isDemoMode(): boolean {
  return !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * 低スコア(tier=low)商品をサイトに表示するかのトグル。
 * SHOW_LOW_TIER=false で一覧・詳細から低tierを除外(データは残るので即時に戻せる)。
 */
function showLowTier(): boolean {
  return process.env.SHOW_LOW_TIER !== "false";
}

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function publicSupabaseKey(): string {
  if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
  if (process.env.NODE_ENV !== "production") {
    return process.env.SUPABASE_SERVICE_ROLE_KEY!;
  }
  throw new Error("SUPABASE_ANON_KEY is required in production");
}

function publicSupabase(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      process.env.SUPABASE_URL!,
      publicSupabaseKey(),
      { auth: { persistSession: false } }
    );
  }
  return publicClient;
}

function adminSupabase(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return adminClient;
}

const DEMO_CATEGORIES: Category[] = [
  {
    slug: "kitchen",
    name: "キッチン・調理器具",
    searchKeywords: [],
    isActive: true,
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToProduct(row: any): Product {
  return {
    id: row.id,
    source: row.source,
    sourceItemId: row.source_item_id,
    title: row.title,
    description: row.description,
    maker: row.maker,
    brand: row.brand,
    imageUrl: row.image_url,
    price: row.price,
    fetchedAt: row.fetched_at ?? null,
    contentUpdatedAt: row.content_updated_at ?? null,
    priceUpdatedAt: row.price_updated_at,
    affiliateUrl: row.affiliate_url,
    categorySlug: row.category_slug,
    reviewCount: row.review_count ?? null,
    reviewAverage: row.review_average ?? null,
    affiliateRate: row.affiliate_rate ?? null,
    postageIncluded: row.postage_included === true,
    saleStartAt: row.sale_start_at ?? null,
    saleEndAt: row.sale_end_at ?? null,
    pointRate: row.point_rate ?? null,
    pointRateStartAt: row.point_rate_start_at ?? null,
    pointRateEndAt: row.point_rate_end_at ?? null,
    promotionFetchedAt: row.promotion_fetched_at ?? null,
    searchRank: row.search_rank ?? null,
    demandScore: row.demand_score ?? 0,
    featuredScore: row.featured_score ?? row.score ?? 0,
    score: row.score,
    tier: row.tier,
    evidenceType: row.evidence_type,
    evidenceText: row.evidence_text,
    judgedAt: row.judged_at ?? null,
    isPublished: row.is_published ?? true,
    judgmentStatus:
      row.judgment_status ?? (row.is_published === false ? "pending" : "current"),
    judgmentInputHash: row.judgment_input_hash ?? null,
    judgmentInputHashAtJudgment:
      row.judgment_input_hash_at_judgment ?? row.input_hash ?? null,
    consistencyStatus: row.consistency_status ?? "legacy",
    consistencyIssues: Array.isArray(row.consistency_issues)
      ? row.consistency_issues
      : [],
    checks:
      row.origin_check && row.company_check && row.material_check
        ? {
            origin: row.origin_check,
            company: row.company_check,
            material: row.material_check,
          }
        : null,
  };
}

function rowToProductPage(row: any): ProductPageData {
  const hasJudgment =
    row.score != null &&
    row.tier != null &&
    row.evidence_type != null &&
    row.evidence_text != null;
  return {
    id: row.id,
    source: row.source,
    sourceItemId: row.source_item_id,
    title: row.title,
    description: row.description ?? null,
    maker: row.maker ?? null,
    brand: row.brand ?? null,
    imageUrl: row.image_url ?? null,
    price: row.price ?? null,
    fetchedAt:
      row.fetched_at ??
      row.last_seen_at ??
      row.price_updated_at ??
      null,
    contentUpdatedAt:
      row.content_updated_at ?? row.updated_at ?? row.created_at ?? null,
    priceUpdatedAt: row.price_updated_at ?? null,
    affiliateUrl: row.affiliate_url,
    categorySlug: row.category_slug,
    reviewCount: row.review_count ?? null,
    reviewAverage: row.review_average ?? null,
    affiliateRate: row.affiliate_rate ?? null,
    searchRank: row.search_rank ?? null,
    demandScore: row.demand_score ?? 0,
    featuredScore: row.featured_score ?? row.score ?? 0,
    isPublished: row.is_published ?? false,
    judgmentStatus:
      row.judgment_status ??
      (row.is_published === true ? "current" : "pending"),
    judgmentInputHash: row.judgment_input_hash ?? null,
    score: hasJudgment ? row.score : null,
    tier: hasJudgment ? row.tier : null,
    evidenceType: hasJudgment ? row.evidence_type : null,
    evidenceText: hasJudgment ? row.evidence_text : null,
    judgedAt: hasJudgment ? (row.judged_at ?? null) : null,
    judgmentInputHashAtJudgment: hasJudgment
      ? (row.judgment_input_hash_at_judgment ?? row.input_hash ?? null)
      : null,
    consistencyStatus: hasJudgment
      ? (row.consistency_status ?? "legacy")
      : null,
    consistencyIssues:
      hasJudgment && Array.isArray(row.consistency_issues)
        ? row.consistency_issues
        : [],
    checks:
      hasJudgment &&
      row.origin_check &&
      row.company_check &&
      row.material_check
        ? {
            origin: row.origin_check,
            company: row.company_check,
            material: row.material_check,
          }
        : null,
  };
}

export const getCategories = cache(async (): Promise<Category[]> => {
  if (isDemoMode()) return DEMO_CATEGORIES;
  const { data, error } = await publicSupabase()
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("id");
  if (error) throw error;
  return data.map((row) => ({
    slug: row.slug,
    name: row.name,
    searchKeywords: row.search_keywords ?? [],
    isActive: row.is_active,
  }));
});

export type SortKey =
  | "featured"
  | "score"
  | "reviews"
  | "price_asc"
  | "price_desc"
  | "new";

function productFeaturedScore(product: Product): number {
  return product.featuredScore ?? calculateFeaturedScore(product.score, product.demandScore ?? 0);
}

function timeValue(value: string | null): number {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareProductIds(a: Product, b: Product): number {
  return a.id.localeCompare(b.id);
}

export type PublishedProductOptions = {
  categorySlug?: string;
  sort?: SortKey;
  tier?: Tier;
  priceFilter?: PriceFilterKey;
  reviewFilter?: ReviewFilterKey;
  limit?: number;
};

export type PublishedProductPage = {
  products: Product[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
};

async function queryPublishedProducts(
  opts: PublishedProductOptions & {
    offset?: number;
    includeTotal?: boolean;
  },
): Promise<{ products: Product[]; totalCount: number | null }> {
  const {
    categorySlug,
    sort = "featured",
    tier,
    priceFilter,
    reviewFilter,
    limit = CATEGORY_PAGE_SIZE,
    offset = 0,
    includeTotal = false,
  } = opts;

  if (isDemoMode()) {
    let items = demoProducts as unknown as Product[];
    if (categorySlug) items = items.filter((p) => p.categorySlug === categorySlug);
    if (tier) items = items.filter((p) => p.tier === tier);
    if (!showLowTier()) items = items.filter((p) => p.tier !== "low");
    items = items.filter((p) => matchesShoppingFilters(p, priceFilter, reviewFilter));
    items = [...items].sort((a, b) => {
      if (sort === "price_asc") {
        return (a.price ?? 0) - (b.price ?? 0) || compareProductIds(a, b);
      }
      if (sort === "price_desc") {
        return (b.price ?? 0) - (a.price ?? 0) || compareProductIds(a, b);
      }
      if (sort === "new") {
        return (
          timeValue(b.priceUpdatedAt) - timeValue(a.priceUpdatedAt) ||
          compareProductIds(a, b)
        );
      }
      if (sort === "reviews") {
        return (
          (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
          (b.reviewAverage ?? 0) - (a.reviewAverage ?? 0) ||
          productFeaturedScore(b) - productFeaturedScore(a) ||
          compareProductIds(a, b)
        );
      }
      if (sort === "featured") {
        return (
          productFeaturedScore(b) - productFeaturedScore(a) ||
          (b.demandScore ?? 0) - (a.demandScore ?? 0) ||
          b.score - a.score ||
          compareProductIds(a, b)
        );
      }
      return b.score - a.score || compareProductIds(a, b);
    });
    return {
      products: items.slice(offset, offset + limit),
      totalCount: includeTotal ? items.length : null,
    };
  }

  const source = publicSupabase().from("products_with_judgment");
  let query = (
    includeTotal
      ? source.select("*", { count: "exact" })
      : source.select("*")
  )
    .eq("is_published", true)
    .range(offset, offset + limit - 1);
  if (categorySlug) query = query.eq("category_slug", categorySlug);
  if (tier) query = query.eq("tier", tier);
  if (!showLowTier()) query = query.neq("tier", "low");
  if (priceFilter === "under-3000") query = query.gt("price", 0).lt("price", 3000);
  else if (priceFilter === "3000-9999") query = query.gte("price", 3000).lt("price", 10000);
  else if (priceFilter === "10000-29999") query = query.gte("price", 10000).lt("price", 30000);
  else if (priceFilter === "30000-plus") query = query.gte("price", 30000);
  if (reviewFilter) query = query.gte("review_average", 4).gte("review_count", 1);
  if (reviewFilter === "popular-100") query = query.gte("review_count", 100);
  if (sort === "price_asc") {
    query = query.order("price", { ascending: true, nullsFirst: false });
  } else if (sort === "price_desc") {
    query = query.order("price", { ascending: false, nullsFirst: false });
  } else if (sort === "new") {
    query = query.order("created_at", { ascending: false });
  }
  else if (sort === "reviews") {
    query = query
      .order("review_count", { ascending: false, nullsFirst: false })
      .order("review_average", { ascending: false, nullsFirst: false })
      .order("featured_score", { ascending: false });
  }
  else if (sort === "featured") {
    query = query
      .order("featured_score", { ascending: false })
      .order("demand_score", { ascending: false })
      .order("score", { ascending: false });
  } else query = query.order("score", { ascending: false });
  query = query.order("id", { ascending: true });

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    products: data.map(rowToProduct),
    totalCount: includeTotal ? count ?? 0 : null,
  };
}

export async function getPublishedProducts(
  opts: PublishedProductOptions,
): Promise<Product[]> {
  const result = await queryPublishedProducts(opts);
  return result.products;
}

export async function getPublishedProductPage(
  opts: Omit<PublishedProductOptions, "limit"> & {
    page?: number;
    pageSize?: number;
  },
): Promise<PublishedProductPage> {
  const currentPage = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.max(1, Math.floor(opts.pageSize ?? CATEGORY_PAGE_SIZE));
  const result = await queryPublishedProducts({
    ...opts,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    includeTotal: true,
  });
  const totalCount = result.totalCount ?? 0;

  return {
    products: result.products,
    totalCount,
    currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getTopProducts(limit = 12): Promise<Product[]> {
  const high = await getPublishedProducts({ sort: "featured", tier: "high", limit });
  if (high.length >= limit) return high;

  const mid = await getPublishedProducts({
    sort: "featured",
    tier: "mid",
    limit: limit - high.length,
  });
  return [...high, ...mid];
}

export async function getRecommendedProducts(limit = 120): Promise<Product[]> {
  const candidates = await getPublishedProducts({
    sort: "featured",
    limit: Math.max(limit * 2, 180),
  });
  return candidates.filter((product) => product.tier !== "low").slice(0, limit);
}

export async function getPopularReviewedProducts(limit = 24): Promise<Product[]> {
  const candidates = await getPublishedProducts({
    sort: "reviews",
    reviewFilter: "popular-100",
    limit: Math.max(limit * 2, 40),
  });
  return candidates.filter((product) => product.tier !== "low").slice(0, limit);
}

function demoDealProducts(now: Date): Product[] {
  const fetchedAt = now.toISOString();
  const startAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  return (demoProducts as unknown as Product[])
    .filter((product) => product.source === "rakuten")
    .slice(0, 6)
    .map((product, index) => ({
      ...product,
      postageIncluded: index % 2 === 0,
      saleStartAt: index < 3 ? startAt : null,
      saleEndAt: index < 3 ? endAt : null,
      pointRate: index >= 2 && index < 5 ? 5 + index : null,
      pointRateStartAt: index >= 2 && index < 5 ? startAt : null,
      pointRateEndAt: index >= 2 && index < 5 ? endAt : null,
      promotionFetchedAt: fetchedAt,
    }))
    .filter((product) => hasActivePromotion(product, now));
}

/** 楽天から直近48時間以内に取得した、現在有効な販促条件つき公開商品。 */
export async function getDealProducts(limit = 300, now = new Date()): Promise<Product[]> {
  if (isDemoMode()) return demoDealProducts(now).slice(0, limit);

  const freshSince = new Date(
    now.getTime() - 48 * 60 * 60 * 1000,
  ).toISOString();
  const { data: promotionRows, error: promotionError } = await publicSupabase()
    .from("products")
    .select(
      "id,postage_included,sale_start_at,sale_end_at,point_rate,point_rate_start_at,point_rate_end_at,promotion_fetched_at",
    )
    .eq("source", "rakuten")
    .eq("is_published", true)
    .gte("promotion_fetched_at", freshSince)
    .or(`postage_included.eq.true,sale_end_at.gt.${now.toISOString()},point_rate.gte.2`)
    .order("promotion_fetched_at", { ascending: false })
    .limit(Math.max(limit * 2, 300));

  if (promotionError) {
    if (
      promotionError.code === "42703" ||
      promotionError.code === "PGRST204" ||
      /postage_included|sale_start_at|point_rate|promotion_fetched_at/i.test(
        promotionError.message ?? "",
      )
    ) {
      return [];
    }
    throw promotionError;
  }

  const promotionsById = new Map(
    promotionRows.map((row) => [String(row.id), row]),
  );
  const productIds = [...promotionsById.keys()];
  if (productIds.length === 0) return [];

  const rows: Product[] = [];
  for (let index = 0; index < productIds.length; index += 200) {
    let query = publicSupabase()
      .from("products_with_judgment")
      .select("*")
      .in("id", productIds.slice(index, index + 200))
      .eq("is_published", true);
    if (!showLowTier()) query = query.neq("tier", "low");
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data) {
      const promotion = promotionsById.get(String(row.id));
      rows.push(
        rowToProduct({
          ...row,
          ...promotion,
        }),
      );
    }
  }

  return rows
    .filter((product) => hasActivePromotion(product, now))
    .sort(
      (a, b) =>
        productFeaturedScore(b) - productFeaturedScore(a) ||
        compareProductIds(a, b),
    )
    .slice(0, limit);
}

export async function searchPublishedProducts(
  terms: string[],
  opts: {
    priceFilter?: PriceFilterKey;
    reviewFilter?: ReviewFilterKey;
    limit?: number;
  } = {},
): Promise<Product[]> {
  if (terms.length === 0) return [];
  const { priceFilter, reviewFilter, limit = 60 } = opts;

  if (isDemoMode()) {
    return (demoProducts as unknown as Product[])
      .filter((product) => showLowTier() || product.tier !== "low")
      .filter((product) => matchesProductSearch(product, terms))
      .filter((product) => matchesShoppingFilters(product, priceFilter, reviewFilter))
      .sort((a, b) => productFeaturedScore(b) - productFeaturedScore(a) || b.score - a.score)
      .slice(0, limit);
  }

  const firstTerm = terms[0];
  const candidateLimit = Math.max(limit * 3, 180);
  const baseQuery = () => {
    let query = publicSupabase()
      .from("products_with_judgment")
      .select("*")
      .eq("is_published", true)
      .order("featured_score", { ascending: false })
      .order("demand_score", { ascending: false })
      .order("score", { ascending: false })
      .limit(candidateLimit);
    if (!showLowTier()) query = query.neq("tier", "low");
    if (priceFilter === "under-3000") query = query.gt("price", 0).lt("price", 3000);
    else if (priceFilter === "3000-9999") query = query.gte("price", 3000).lt("price", 10000);
    else if (priceFilter === "10000-29999") query = query.gte("price", 10000).lt("price", 30000);
    else if (priceFilter === "30000-plus") query = query.gte("price", 30000);
    if (reviewFilter) query = query.gte("review_average", 4).gte("review_count", 1);
    if (reviewFilter === "popular-100") query = query.gte("review_count", 100);
    return query;
  };

  const responses = await Promise.all([
    baseQuery().ilike("title", `%${firstTerm}%`),
    baseQuery().ilike("brand", `%${firstTerm}%`),
    baseQuery().ilike("maker", `%${firstTerm}%`),
  ]);
  const failed = responses.find((response) => response.error);
  if (failed?.error) throw failed.error;

  const candidates = new Map<string, Product>();
  for (const response of responses) {
    for (const row of response.data ?? []) {
      const product = rowToProduct(row);
      candidates.set(product.id, product);
    }
  }
  return [...candidates.values()]
    .filter((product) => matchesProductSearch(product, terms))
    .filter((product) => matchesShoppingFilters(product, priceFilter, reviewFilter))
    .sort((a, b) => productFeaturedScore(b) - productFeaturedScore(a) || b.score - a.score)
    .slice(0, limit);
}

export async function getSitemapProducts(): Promise<Product[]> {
  if (isDemoMode()) {
    return (demoProducts as unknown as Product[])
      .filter((product) => showLowTier() || product.tier !== "low");
  }

  const rows: Product[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = publicSupabase()
      .from("products_with_judgment")
      .select("*")
      .eq("is_published", true)
      .order("id", { ascending: true });
    if (!showLowTier()) query = query.neq("tier", "low");
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data.map(rowToProduct));
    if (data.length < pageSize) break;
  }
  return rows;
}

export async function getFeatureProducts(opts: {
  categorySlugs: string[];
  minScore: number;
  maxPrice?: number;
  titleTermGroups?: string[][];
  excludeTitleTerms?: string[];
  limit?: number;
}): Promise<Product[]> {
  const {
    categorySlugs,
    minScore,
    maxPrice,
    titleTermGroups,
    excludeTitleTerms,
    limit = 24,
  } = opts;
  const definition = {
    slug: "query",
    eyebrow: "",
    title: "",
    shortTitle: "",
    description: "",
    categorySlugs,
    minScore,
    maxPrice,
    titleTermGroups,
    excludeTitleTerms,
  };
  const matches = (product: Product) => matchesFeatureProduct(definition, product);

  if (isDemoMode()) {
    return (demoProducts as unknown as Product[])
      .filter(matches)
      .sort((a, b) => productFeaturedScore(b) - productFeaturedScore(a))
      .slice(0, limit);
  }

  let query = publicSupabase()
    .from("products_with_judgment")
    .select("*")
    .eq("is_published", true)
    .in("category_slug", categorySlugs)
    .gte("score", minScore)
    .order("featured_score", { ascending: false })
    .order("demand_score", { ascending: false })
    .limit(250);
  if (maxPrice != null) query = query.lte("price", maxPrice);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(rowToProduct).filter(matches).slice(0, limit);
}

export async function getRegionProducts(opts: {
  titleTerms: string[];
  minScore: number;
  limit?: number;
}): Promise<Product[]> {
  const { titleTerms, minScore, limit = 24 } = opts;
  const definition = {
    slug: "query",
    name: "",
    eyebrow: "",
    title: "",
    description: "",
    titleTerms,
    minScore,
  };
  const matches = (product: Product) => matchesRegionProduct(definition, product);

  if (isDemoMode()) {
    return (demoProducts as unknown as Product[])
      .filter(matches)
      .sort((a, b) => productFeaturedScore(b) - productFeaturedScore(a))
      .slice(0, limit);
  }

  const titleFilter = titleTerms
    .map((term) => `title.ilike.%${term.replace(/[,%()]/g, "")}%`)
    .join(",");
  const { data, error } = await publicSupabase()
    .from("products_with_judgment")
    .select("*")
    .eq("is_published", true)
    .gte("score", minScore)
    .or(titleFilter)
    .order("featured_score", { ascending: false })
    .order("demand_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(rowToProduct).filter(matches);
}

export async function getProduct(id: string): Promise<Product | null> {
  if (isDemoMode()) {
    const items = demoProducts as unknown as Product[];
    const found = items.find((p) => p.id === id) ?? null;
    return found && !showLowTier() && found.tier === "low" ? null : found;
  }
  let query = publicSupabase()
    .from("products_with_judgment")
    .select("*")
    .eq("id", id)
    .eq("is_published", true);
  if (!showLowTier()) query = query.neq("tier", "low");
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data) : null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingPublicProductPageRpc(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /get_public_product_page/i.test(error.message ?? "")
  );
}

export async function productFreshnessMigrationAvailable(): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await adminSupabase()
    .from("products")
    .select("fetched_at,content_updated_at,judgment_input_hash,judgment_status")
    .limit(0);
  if (!error) return true;
  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /fetched_at|content_updated_at|judgment_input_hash|judgment_status/i.test(
      error.message ?? "",
    )
  ) {
    return false;
  }
  throw error;
}

export async function safeProductPageMigrationAvailable(): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await publicSupabase().rpc("get_public_product_page", {
    p_product_id: "00000000-0000-4000-8000-000000000000",
  });
  if (!error) return true;
  if (isMissingPublicProductPageRpc(error)) return false;
  throw error;
}

/**
 * 商品詳細URL専用。020適用後はpending/blockedも安全な限定列だけ取得する。
 * 移行前DBではcurrent公開商品だけを返す既存経路へ後方互換フォールバックする。
 */
export const getProductPage = cache(
  async (id: string): Promise<ProductPageData | null> => {
    if (isDemoMode()) {
      const product = await getProduct(id);
      return product ? rowToProductPage({
        ...product,
        source_item_id: product.sourceItemId,
        image_url: product.imageUrl,
        price_updated_at: product.priceUpdatedAt,
        affiliate_url: product.affiliateUrl,
        category_slug: product.categorySlug,
        review_count: product.reviewCount,
        review_average: product.reviewAverage,
        affiliate_rate: product.affiliateRate,
        search_rank: product.searchRank,
        demand_score: product.demandScore,
        featured_score: product.featuredScore,
        is_published: product.isPublished ?? true,
        judgment_status: product.judgmentStatus ?? "current",
        judgment_input_hash: product.judgmentInputHash ?? null,
        evidence_type: product.evidenceType,
        evidence_text: product.evidenceText,
        judged_at: product.judgedAt,
        input_hash: product.judgmentInputHashAtJudgment,
        consistency_status: product.consistencyStatus,
        consistency_issues: product.consistencyIssues,
        origin_check: product.checks?.origin,
        company_check: product.checks?.company,
        material_check: product.checks?.material,
      }) : null;
    }
    if (!UUID_PATTERN.test(id)) return null;

    const { data, error } = await publicSupabase()
      .rpc("get_public_product_page", { p_product_id: id })
      .maybeSingle();
    if (error) {
      if (!isMissingPublicProductPageRpc(error)) throw error;
      const product = await getProduct(id);
      return product
        ? {
            ...product,
            isPublished: product.isPublished ?? true,
            judgmentStatus: product.judgmentStatus ?? "current",
            judgmentInputHash: product.judgmentInputHash ?? null,
            judgmentInputHashAtJudgment:
              product.judgmentInputHashAtJudgment ?? null,
            consistencyStatus: product.consistencyStatus ?? "legacy",
            consistencyIssues: product.consistencyIssues ?? [],
          }
        : null;
    }
    if (!data) return null;
    const product = rowToProductPage(data);
    if (
      !showLowTier() &&
      product.judgmentStatus === "current" &&
      product.tier === "low"
    ) {
      return null;
    }
    return product;
  },
);

/**
 * 管理権限による読み取り専用の全件監査。
 * products_with_judgmentに出ないpending/blockedと、1000件超の履歴も集計対象にする。
 */
export async function getProductIndexAuditRecords(): Promise<ProductPageData[]> {
  if (isDemoMode()) {
    return (demoProducts as unknown as Product[]).map((product) => ({
      ...product,
      isPublished: product.isPublished ?? true,
      judgmentStatus: product.judgmentStatus ?? "current",
      judgmentInputHash: product.judgmentInputHash ?? null,
      judgmentInputHashAtJudgment:
        product.judgmentInputHashAtJudgment ?? null,
      consistencyStatus: product.consistencyStatus ?? "legacy",
      consistencyIssues: product.consistencyIssues ?? [],
    }));
  }

  const db = adminSupabase();
  const [products, judgments] = await Promise.all([
    readAllPages<any>(async (from, to) => {
      const { data, error } = await db
        .from("products")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return data;
    }),
    readAllPages<any>(async (from, to) => {
      const { data, error } = await db
        .from("judgments")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return data;
    }),
  ]);

  const productById = new Map(
    products.map((product) => [product.id, product]),
  );
  const matchingJudgmentByProduct = new Map<string, any>();
  for (const judgment of judgments) {
    const product = productById.get(judgment.product_id);
    if (!product) continue;
    const productHash = product.judgment_input_hash ?? null;
    const judgmentHash = judgment.input_hash ?? null;
    if (productHash !== judgmentHash) continue;
    const previous = matchingJudgmentByProduct.get(judgment.product_id);
    const judgmentTime = Date.parse(judgment.judged_at ?? "") || 0;
    const previousTime = Date.parse(previous?.judged_at ?? "") || 0;
    if (
      !previous ||
      judgmentTime > previousTime ||
      (judgmentTime === previousTime &&
        Number(judgment.id) > Number(previous.id))
    ) {
      matchingJudgmentByProduct.set(judgment.product_id, judgment);
    }
  }

  return products.map((product) => {
    const judgment = matchingJudgmentByProduct.get(product.id);
    return rowToProductPage({
      ...product,
      ...(judgment
        ? {
            score: judgment.score,
            tier: judgment.tier,
            evidence_type: judgment.evidence_type,
            evidence_text: judgment.evidence_text,
            origin_check: judgment.origin_check,
            company_check: judgment.company_check,
            material_check: judgment.material_check,
            judged_at: judgment.judged_at,
            judgment_input_hash_at_judgment: judgment.input_hash ?? null,
            consistency_status: judgment.consistency_status ?? "legacy",
            consistency_issues: judgment.consistency_issues ?? [],
          }
        : {}),
    });
  });
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (isDemoMode()) {
    return (demoProducts as unknown as Product[])
      .filter(
        (item) =>
          item.id !== product.id &&
          item.categorySlug === product.categorySlug &&
          item.score >= 80
      )
      .sort((a, b) => productFeaturedScore(b) - productFeaturedScore(a))
      .slice(0, limit);
  }

  const { data, error } = await publicSupabase()
    .from("products_with_judgment")
    .select("*")
    .eq("is_published", true)
    .eq("category_slug", product.categorySlug)
    .neq("id", product.id)
    .gte("score", 80)
    .order("featured_score", { ascending: false })
    .order("demand_score", { ascending: false })
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(rowToProduct);
}

async function latestJudgment(
  db: SupabaseClient,
  productId: string
): Promise<{ id: number; score: number; input_hash: string | null } | null> {
  const { data, error } = await db
    .from("judgments")
    .select("id,score,input_hash")
    .eq("product_id", productId)
    .order("judged_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** 収集パイプライン用: 商品をupsertし、新規作成ならidを返す。 */
export async function upsertProduct(raw: RawProduct): Promise<string | null> {
  const now = new Date().toISOString();
  const db = adminSupabase();
  const demandScore = calculateDemandScore({
    searchRank: raw.searchRank,
    reviewCount: raw.reviewCount,
    reviewAverage: raw.reviewAverage,
    affiliateRate: raw.affiliateRate,
  });

  const { data: existing, error: selErr } = await db
    .from("products")
    .select(
      "id,source,title,description,maker,brand,judgment_input_hash,content_updated_at,created_at,is_published,judgment_status",
    )
    .eq("source", raw.source)
    .eq("source_item_id", raw.sourceItemId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const refresh = planProductRefresh(
      {
        source: existing.source,
        title: existing.title,
        description: existing.description,
        maker: existing.maker,
        brand: existing.brand,
        judgmentInputHash: existing.judgment_input_hash,
        contentUpdatedAt: existing.content_updated_at,
        createdAt: existing.created_at,
        isPublished: existing.is_published,
        judgmentStatus: existing.judgment_status,
      },
      raw,
      now,
    );
    const latest = await latestJudgment(db, existing.id);
    const shouldBindLegacyJudgment =
      !refresh.inputChanged &&
      existing.judgment_status === "current" &&
      latest?.input_hash === null;

    const score =
      latest &&
      (latest.input_hash === refresh.judgmentInputHash ||
        shouldBindLegacyJudgment)
        ? latest.score
        : null;
    const { error } = await db
      .from("products")
      .update({
        ...refreshedProductFields(raw),
        postage_included: raw.postageIncluded ?? false,
        sale_start_at: raw.saleStartAt ?? null,
        sale_end_at: raw.saleEndAt ?? null,
        point_rate: raw.pointRate ?? null,
        point_rate_start_at: raw.pointRateStartAt ?? null,
        point_rate_end_at: raw.pointRateEndAt ?? null,
        promotion_fetched_at: raw.source === "rakuten" ? now : null,
        price_updated_at: now,
        demand_score: demandScore,
        featured_score:
          refresh.inputChanged ||
          refresh.judgmentStatus !== "current" ||
          score == null
            ? 0
            : calculateFeaturedScore(score, demandScore),
        judgment_input_hash: refresh.judgmentInputHash,
        judgment_status: refresh.judgmentStatus,
        is_published: refresh.isPublished,
        fetched_at: now,
        content_updated_at: refresh.contentUpdatedAt,
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw error;

    // 商品側を先に更新すると、途中失敗時もハッシュ不一致で判定ビューから隠れる。
    // 内容が変わっていない移行前行だけ、続けて最新判定へ現在のハッシュを結び付ける。
    if (shouldBindLegacyJudgment && latest) {
      const { error: judgmentHashError } = await db
        .from("judgments")
        .update({ input_hash: refresh.judgmentInputHash })
        .eq("id", latest.id)
        .is("input_hash", null);
      if (judgmentHashError) throw judgmentHashError;
    }
    return null;
  }

  const { data, error } = await db
    .from("products")
    .insert({
      source: raw.source,
      source_item_id: raw.sourceItemId,
      ...refreshedProductFields(raw),
      postage_included: raw.postageIncluded ?? false,
      sale_start_at: raw.saleStartAt ?? null,
      sale_end_at: raw.saleEndAt ?? null,
      point_rate: raw.pointRate ?? null,
      point_rate_start_at: raw.pointRateStartAt ?? null,
      point_rate_end_at: raw.pointRateEndAt ?? null,
      promotion_fetched_at: raw.source === "rakuten" ? now : null,
      price_updated_at: now,
      category_slug: raw.categorySlug,
      demand_score: demandScore,
      featured_score: 0,
      judgment_input_hash: judgmentInputHash(raw),
      judgment_status: "pending",
      fetched_at: now,
      content_updated_at: now,
      last_seen_at: now,
      is_published: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** 収集計画用: カテゴリごとの公開数と判定待ち数をまとめて取得する。 */
export async function getCategoryInventory(): Promise<Record<string, CategoryInventory>> {
  if (isDemoMode()) {
    const inventory: Record<string, CategoryInventory> = {};
    for (const product of demoProducts as unknown as Product[]) {
      const counts = inventory[product.categorySlug] ?? { published: 0, pending: 0 };
      counts.published++;
      inventory[product.categorySlug] = counts;
    }
    return inventory;
  }

  const rows: {
    id: string;
    category_slug: string;
    is_published: boolean;
    judgment_status: "pending" | "current" | "blocked";
  }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await adminSupabase()
      .from("products")
      .select("id,category_slug,is_published,judgment_status")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  const inventory: Record<string, CategoryInventory> = {};
  for (const row of rows) {
    const counts = inventory[row.category_slug] ?? { published: 0, pending: 0 };
    if (row.is_published) counts.published++;
    else if (row.judgment_status === "pending") counts.pending++;
    inventory[row.category_slug] = counts;
  }
  return inventory;
}

/**
 * 未判定(is_published=false=まだ判定が保存されていない)商品を古い順に取得。
 * 収集時に判定しきれなかったバックログを次回以降のCronで消化するために使う。
 */
export async function getUnjudgedProducts(
  limit: number,
  categorySlugs?: string[],
  categoryLimits?: Record<string, number>,
  createdAfter?: string,
): Promise<{ id: string; raw: RawProduct }[]> {
  const candidateLimit = Math.max(limit * 20, limit);
  let query = adminSupabase()
    .from("products")
    .select("*")
    .eq("is_published", false)
    .eq("judgment_status", "pending")
    .order("featured_score", { ascending: false })
    .order("demand_score", { ascending: false })
    .order("search_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (categorySlugs?.length) query = query.in("category_slug", categorySlugs);
  if (createdAfter) query = query.gte("created_at", createdAfter);
  const { data, error } = await query.limit(candidateLimit);
  if (error) throw error;

  // 各カテゴリ内の需要順を保ちつつ一巡ずつ選び、判定枠のジャンル偏りを防ぐ。
  const queues = new Map<string, typeof data>();
  for (const row of data) {
    const queue = queues.get(row.category_slug) ?? [];
    queue.push(row);
    queues.set(row.category_slug, queue);
  }

  const selected: typeof data = [];
  const selectedCounts = new Map<string, number>();
  while (selected.length < limit) {
    let added = false;
    for (const [categorySlug, queue] of queues) {
      const categoryLimit = categoryLimits?.[categorySlug];
      const selectedCount = selectedCounts.get(categorySlug) ?? 0;
      if (categoryLimit != null && selectedCount >= categoryLimit) continue;
      const row = queue.shift();
      if (!row) continue;
      selected.push(row);
      selectedCounts.set(categorySlug, selectedCount + 1);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
  }

  return selected.map((row) => ({
    id: row.id,
    raw: {
      source: row.source,
      sourceItemId: row.source_item_id,
      title: row.title,
      description: row.description,
      maker: row.maker,
      brand: row.brand,
      imageUrl: row.image_url,
      price: row.price,
      affiliateUrl: row.affiliate_url,
      itemUrl: row.item_url ?? "",
      categorySlug: row.category_slug,
      reviewCount: row.review_count ?? null,
      reviewAverage: row.review_average ?? null,
      affiliateRate: row.affiliate_rate ?? null,
      searchRank: row.search_rank ?? null,
    },
  }));
}

/**
 * 判定結果を保存して公開する。
 * 低スコアも公開する方針(「日本度は低いが安い」という選択肢もユーザーに委ねる2軸コンセプト)。
 * スコアは必ず表示されるため、低スコア商品の掲載自体は誤認にならない。
 */
export interface JudgmentSaveResult {
  published: boolean;
  consistencyIssues: string[];
}

export async function saveJudgment(
  productId: string,
  j: Judgment,
): Promise<JudgmentSaveResult> {
  const db = adminSupabase();
  const { data: product, error: productErr } = await db
    .from("products")
    .select(
      "id,source,source_item_id,title,description,maker,brand,image_url,price,affiliate_url,item_url,category_slug,review_count,review_average,affiliate_rate,search_rank,demand_score,judgment_input_hash,content_updated_at,created_at",
    )
    .eq("id", productId)
    .single();
  if (productErr) throw productErr;

  const raw: RawProduct = {
    source: product.source,
    sourceItemId: product.source_item_id,
    title: product.title,
    description: product.description,
    maker: product.maker,
    brand: product.brand,
    imageUrl: product.image_url,
    price: product.price,
    affiliateUrl: product.affiliate_url,
    itemUrl: product.item_url ?? "",
    categorySlug: product.category_slug,
    reviewCount: product.review_count ?? null,
    reviewAverage: product.review_average ?? null,
    affiliateRate: product.affiliate_rate ?? null,
    searchRank: product.search_rank ?? null,
  };
  const inputHash = judgmentInputHash(raw);
  if (
    product.judgment_input_hash !== null &&
    product.judgment_input_hash !== inputHash
  ) {
    throw new Error("商品内容ハッシュが保存内容と一致しないため判定を保存できません");
  }

  if (product.judgment_input_hash === null) {
    const { error: bootstrapError } = await db
      .from("products")
      .update({
        judgment_input_hash: inputHash,
        content_updated_at:
          product.content_updated_at ?? product.created_at ?? new Date().toISOString(),
      })
      .eq("id", productId)
      .is("judgment_input_hash", null);
    if (bootstrapError) throw bootstrapError;
  }

  const consistencyIssues = detectJudgmentConsistencyIssues(raw, j);
  const consistencyStatus =
    consistencyIssues.length === 0 ? "passed" : "blocked";
  const { error } = await db.from("judgments").insert({
    product_id: productId,
    input_hash: inputHash,
    score: j.score,
    tier: j.tier,
    evidence_type: j.evidenceType,
    evidence_text: j.evidenceText,
    origin_check: j.checks.origin,
    company_check: j.checks.company,
    material_check: j.checks.material,
    confidence: j.confidence,
    model: j.model,
    consistency_status: consistencyStatus,
    consistency_issues: consistencyIssues,
  });
  if (error) throw error;

  const nextPublished = consistencyIssues.length === 0;
  const { data: updated, error: updateError } = await db
    .from("products")
    .update({
      is_published: nextPublished,
      judgment_status: nextPublished ? "current" : "blocked",
      featured_score: nextPublished
        ? calculateFeaturedScore(j.score, product.demand_score ?? 0)
        : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("judgment_input_hash", inputHash)
    .select("id")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) {
    throw new Error(
      "判定中に商品内容が更新されたため、この判定は公開せず再判定待ちを維持します",
    );
  }

  return { published: nextPublished, consistencyIssues };
}

export type ContactMessageInput = {
  name: string | null;
  email: string | null;
  topic: string;
  message: string;
  pageUrl: string | null;
};

export async function saveContactMessage(input: ContactMessageInput): Promise<void> {
  if (isDemoMode()) {
    throw new Error("Contact form is not configured");
  }

  const { error } = await adminSupabase().from("contact_messages").insert({
    name: input.name,
    email: input.email,
    topic: input.topic,
    message: input.message,
    page_url: input.pageUrl,
  });
  if (error) throw error;
}

export type OutboundClickInput = {
  productId: string;
  destination: "primary" | "cross";
  merchant: "rakuten" | "amazon";
  placement: ProductPlacement | null;
};

/**
 * 購入導線の匿名集計用。IP、User-Agent、Cookie等は保存しない。
 * 計測失敗で販売ページへの移動を妨げないよう、呼び出し側で例外を処理する。
 */
export async function recordOutboundClick(input: OutboundClickInput): Promise<void> {
  if (isDemoMode()) return;

  const { error } = await adminSupabase().from("outbound_clicks").insert({
    product_id: input.productId,
    destination: input.destination,
    merchant: input.merchant,
    surface: input.placement?.surface ?? null,
    surface_key: input.placement?.surfaceKey ?? null,
    position: input.placement?.position ?? null,
  });
  if (error) throw error;
}

export type ProductImpressionInput = ProductPlacement & { productId: string };

export async function recordProductImpressions(
  impressions: ProductImpressionInput[],
): Promise<void> {
  if (isDemoMode() || impressions.length === 0) return;

  const productIds = [...new Set(impressions.map((item) => item.productId))];
  const { data: published, error: productError } = await adminSupabase()
    .from("products")
    .select("id")
    .in("id", productIds)
    .eq("is_published", true);
  if (productError) throw productError;

  const publishedIds = new Set(published.map((row) => String(row.id)));
  const rows = impressions
    .filter((item) => publishedIds.has(item.productId))
    .map((item) => ({
      product_id: item.productId,
      surface: item.surface,
      surface_key: item.surfaceKey,
      position: item.position,
    }));
  if (rows.length === 0) return;

  const { error } = await adminSupabase().from("product_impressions").insert(rows);
  if (error) throw error;
}

export async function recordProductPageView(
  productId: string,
  placement: ProductPlacement | null,
): Promise<void> {
  if (isDemoMode()) return;

  const { error } = await adminSupabase().from("product_page_views").insert({
    product_id: productId,
    surface: placement?.surface ?? null,
    surface_key: placement?.surfaceKey ?? null,
    position: placement?.position ?? null,
  });
  if (error) throw error;
}

export type ShadowRankingInput = {
  productId: string;
  aiScore: number;
  demandScore: number;
  currentFeaturedScore: number;
  pageViews28d: number;
  outboundClicks28d: number;
  impressions28d: number;
  listingClicks28d: number;
  priceUpdatedAt: string | null;
};

export async function getShadowRankingInputs(): Promise<ShadowRankingInput[]> {
  if (isDemoMode()) return [];

  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await adminSupabase()
      .from("product_ranking_inputs")
      .select("*")
      .order("product_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows.map((row) => ({
    productId: String(row.product_id),
    aiScore: Number(row.ai_score ?? 0),
    demandScore: Number(row.demand_score ?? 0),
    currentFeaturedScore: Number(row.current_featured_score ?? 0),
    pageViews28d: Number(row.page_views_28d ?? 0),
    outboundClicks28d: Number(row.outbound_clicks_28d ?? 0),
    impressions28d: Number(row.impressions_28d ?? 0),
    listingClicks28d: Number(row.listing_clicks_28d ?? 0),
    priceUpdatedAt: row.price_updated_at ? String(row.price_updated_at) : null,
  }));
}

export type ShadowRankingSnapshot = {
  productId: string;
  calculatedOn: string;
  currentScore: number;
  proposedScore: number;
  pageViews28d: number;
  outboundClicks28d: number;
  impressions28d: number;
  listingClicks28d: number;
  smoothedCtr: number;
  reason: string;
};

export type AdminRankingRow = ShadowRankingSnapshot & {
  title: string;
  categorySlug: string;
  categoryName: string;
  source: "rakuten" | "amazon";
  aiScore: number;
};

export type AdminRankingReport = {
  calculatedOn: string | null;
  rows: AdminRankingRow[];
};

export type AdminCollectionRow = {
  kind: "feature" | "region";
  slug: string;
  name: string;
  productCount: number;
  pageViews28d: number;
  outboundClicks28d: number;
  impressions28d: number;
  listingClicks28d: number;
  averageFeaturedScore: number;
  shadowScore: number;
  isRankingReady: boolean;
  rankingReason: string;
};

export type AdminCollectionReport = {
  generatedAt: string;
  rows: AdminCollectionRow[];
};

export type AdminSurfacePositionRow = {
  surface: "home" | "popular" | "recommended" | "deals" | "category" | "search" | "feature" | "region" | "related";
  position: number;
  impressions28d: number;
  listingClicks28d: number;
  productsSeen28d: number;
};

export type AdminSurfacePositionReport = {
  generatedAt: string;
  rows: AdminSurfacePositionRow[];
};

export type AdminProductFunnelRow = {
  productId: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  source: "rakuten" | "amazon";
  aiScore: number;
  impressions28d: number;
  detailViews28d: number;
  listingDetailViews28d: number;
  listingOutboundClicks28d: number;
  detailOutboundClicks28d: number;
};

export type AdminProductFunnelReport = {
  generatedAt: string;
  windowStartedAt: string | null;
  observedDays: number;
  rows: AdminProductFunnelRow[];
};

export async function getAdminProductFunnelReport(): Promise<AdminProductFunnelReport> {
  const generatedAt = new Date().toISOString();
  if (isDemoMode()) {
    return { generatedAt, windowStartedAt: null, observedDays: 0, rows: [] };
  }

  const db = adminSupabase();
  const metrics: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("product_funnel_performance_28d")
      .select("*")
      .order("impressions_28d", { ascending: false })
      .order("product_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    metrics.push(...data);
    if (data.length < pageSize) break;
  }

  const productIds = metrics.map((row) => String(row.product_id));
  const productRows: Record<string, unknown>[] = [];
  for (let index = 0; index < productIds.length; index += 200) {
    const { data, error } = await db
      .from("products_with_judgment")
      .select("id,title,category_slug,source,score")
      .in("id", productIds.slice(index, index + 200));
    if (error) throw error;
    productRows.push(...data);
  }

  const { data: categories, error: categoryError } = await db
    .from("categories")
    .select("slug,name");
  if (categoryError) throw categoryError;

  const productsById = new Map(productRows.map((row) => [String(row.id), row]));
  const categoryNames = new Map(
    categories.map((row) => [String(row.slug), String(row.name)]),
  );
  const rows = metrics.flatMap((metric): AdminProductFunnelRow[] => {
    const productId = String(metric.product_id);
    const product = productsById.get(productId);
    if (!product) return [];
    const categorySlug = String(product.category_slug);
    return [{
      productId,
      title: String(product.title),
      categorySlug,
      categoryName: categoryNames.get(categorySlug) ?? categorySlug,
      source: product.source === "amazon" ? "amazon" : "rakuten",
      aiScore: Number(product.score ?? 0),
      impressions28d: Number(metric.impressions_28d ?? 0),
      detailViews28d: Number(metric.detail_views_28d ?? 0),
      listingDetailViews28d: Number(metric.listing_detail_views_28d ?? 0),
      listingOutboundClicks28d: Number(metric.listing_outbound_clicks_28d ?? 0),
      detailOutboundClicks28d: Number(metric.detail_outbound_clicks_28d ?? 0),
    }];
  });

  const firstMetric = metrics[0];
  return {
    generatedAt,
    windowStartedAt: firstMetric?.window_started_at
      ? String(firstMetric.window_started_at)
      : null,
    observedDays: Math.max(0, Number(firstMetric?.observed_days ?? 0)),
    rows,
  };
}

export async function getAdminSurfacePositionReport(): Promise<AdminSurfacePositionReport> {
  const generatedAt = new Date().toISOString();
  if (isDemoMode()) return { generatedAt, rows: [] };

  const { data, error } = await adminSupabase()
    .from("surface_position_performance_28d")
    .select("*")
    .order("surface", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw error;

  const allowedSurfaces = new Set([
    "home",
    "popular",
    "recommended",
    "deals",
    "category",
    "search",
    "feature",
    "region",
    "related",
  ]);
  const rows = data.flatMap((row): AdminSurfacePositionRow[] => {
    const surface = String(row.surface);
    const position = Number(row.position);
    if (!allowedSurfaces.has(surface) || !Number.isInteger(position)) return [];
    return [{
      surface: surface as AdminSurfacePositionRow["surface"],
      position,
      impressions28d: Number(row.impressions_28d ?? 0),
      listingClicks28d: Number(row.listing_clicks_28d ?? 0),
      productsSeen28d: Number(row.products_seen_28d ?? 0),
    }];
  });

  return { generatedAt, rows };
}

export async function getAdminCollectionReport(): Promise<AdminCollectionReport> {
  const generatedAt = new Date().toISOString();
  const [products, inputs, collectionMetrics] = await Promise.all([
    isDemoMode()
      ? Promise.resolve(demoProducts as unknown as Product[])
      : (async () => {
          const rows: Product[] = [];
          const pageSize = 1000;
          for (let from = 0; ; from += pageSize) {
            const { data, error } = await adminSupabase()
              .from("products_with_judgment")
              .select("*")
              .eq("is_published", true)
              .order("id", { ascending: true })
              .range(from, from + pageSize - 1);
            if (error) throw error;
            rows.push(...data.map(rowToProduct));
            if (data.length < pageSize) break;
          }
          return rows;
        })(),
    getShadowRankingInputs(),
    isDemoMode()
      ? Promise.resolve([] as Record<string, unknown>[])
      : (async () => {
          const { data, error } = await adminSupabase()
            .from("collection_performance_28d")
            .select("*");
          if (error) throw error;
          return data as Record<string, unknown>[];
        })(),
  ]);
  const metricsByProduct = new Map(inputs.map((input) => [input.productId, input]));
  const metricsByCollection = new Map(
    collectionMetrics.map((row) => [
      `${String(row.surface)}:${String(row.surface_key)}`,
      {
        impressions28d: Number(row.impressions_28d ?? 0),
        listingClicks28d: Number(row.listing_clicks_28d ?? 0),
      },
    ]),
  );

  const summarize = (
    kind: AdminCollectionRow["kind"],
    slug: string,
    name: string,
    matches: (product: Product) => boolean,
  ): AdminCollectionRow => {
    const displayedProducts = products
      .filter(matches)
      .sort((a, b) => productFeaturedScore(b) - productFeaturedScore(a))
      .slice(0, 24);
    const summary = displayedProducts.reduce<AdminCollectionRow>(
      (summary, product) => {
        const metrics = metricsByProduct.get(product.id);
        summary.pageViews28d += metrics?.pageViews28d ?? 0;
        summary.outboundClicks28d += metrics?.outboundClicks28d ?? 0;
        summary.averageFeaturedScore += productFeaturedScore(product);
        return summary;
      },
      {
        kind,
        slug,
        name,
        productCount: displayedProducts.length,
        pageViews28d: 0,
        outboundClicks28d: 0,
        impressions28d: 0,
        listingClicks28d: 0,
        averageFeaturedScore: 0,
        shadowScore: 0,
        isRankingReady: false,
        rankingReason: "",
      },
    );
    summary.averageFeaturedScore = summary.productCount > 0
      ? summary.averageFeaturedScore / summary.productCount
      : 0;
    const collectionMetric = metricsByCollection.get(`${kind}:${slug}`);
    summary.impressions28d = collectionMetric?.impressions28d ?? 0;
    summary.listingClicks28d = collectionMetric?.listingClicks28d ?? 0;
    const ranking = calculateCollectionRanking(summary);
    summary.shadowScore = ranking.shadowScore;
    summary.isRankingReady = ranking.isReady;
    summary.rankingReason = ranking.reason;
    return summary;
  };

  return {
    generatedAt,
    rows: [
      ...FEATURES.map((feature) =>
        summarize("feature", feature.slug, feature.shortTitle, (product) =>
          matchesFeatureProduct(feature, product),
        ),
      ),
      ...REGIONS.map((region) =>
        summarize("region", region.slug, region.name, (product) =>
          matchesRegionProduct(region, product),
        ),
      ),
    ],
  };
}

export async function getAdminRankingReport(): Promise<AdminRankingReport> {
  if (isDemoMode()) return { calculatedOn: null, rows: [] };

  const db = adminSupabase();
  const { data: latest, error: latestError } = await db
    .from("ranking_snapshots")
    .select("calculated_on")
    .eq("mode", "shadow")
    .order("calculated_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;
  if (!latest) return { calculatedOn: null, rows: [] };

  const calculatedOn = String(latest.calculated_on);
  const snapshots: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("ranking_snapshots")
      .select("*")
      .eq("mode", "shadow")
      .eq("calculated_on", calculatedOn)
      .order("proposed_score", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    snapshots.push(...data);
    if (data.length < pageSize) break;
  }

  const productIds = snapshots.map((row) => String(row.product_id));
  const productRows: Record<string, unknown>[] = [];
  for (let index = 0; index < productIds.length; index += 200) {
    const { data, error } = await db
      .from("products_with_judgment")
      .select("id,title,category_slug,source,score")
      .in("id", productIds.slice(index, index + 200));
    if (error) throw error;
    productRows.push(...data);
  }

  const { data: categories, error: categoryError } = await db
    .from("categories")
    .select("slug,name");
  if (categoryError) throw categoryError;

  const productsById = new Map(productRows.map((row) => [String(row.id), row]));
  const categoryNames = new Map(
    categories.map((row) => [String(row.slug), String(row.name)])
  );

  const rows = snapshots.flatMap((snapshot): AdminRankingRow[] => {
    const product = productsById.get(String(snapshot.product_id));
    if (!product) return [];
    const categorySlug = String(product.category_slug);
    return [{
      productId: String(snapshot.product_id),
      calculatedOn,
      currentScore: Number(snapshot.current_score),
      proposedScore: Number(snapshot.proposed_score),
      pageViews28d: Number(snapshot.page_views_28d),
      outboundClicks28d: Number(snapshot.outbound_clicks_28d),
      impressions28d: Number(snapshot.impressions_28d ?? 0),
      listingClicks28d: Number(snapshot.listing_clicks_28d ?? 0),
      smoothedCtr: Number(snapshot.smoothed_ctr),
      reason: String(snapshot.reason),
      title: String(product.title),
      categorySlug,
      categoryName: categoryNames.get(categorySlug) ?? categorySlug,
      source: product.source === "amazon" ? "amazon" : "rakuten",
      aiScore: Number(product.score),
    }];
  });

  return { calculatedOn, rows };
}

export async function saveShadowRankingSnapshots(
  snapshots: ShadowRankingSnapshot[]
): Promise<void> {
  if (isDemoMode() || snapshots.length === 0) return;

  const db = adminSupabase();
  const chunkSize = 500;
  for (let i = 0; i < snapshots.length; i += chunkSize) {
    const rows = snapshots.slice(i, i + chunkSize).map((snapshot) => ({
      product_id: snapshot.productId,
      calculated_on: snapshot.calculatedOn,
      mode: "shadow",
      score_version: "commercial-v2",
      current_score: snapshot.currentScore,
      proposed_score: snapshot.proposedScore,
      page_views_28d: snapshot.pageViews28d,
      outbound_clicks_28d: snapshot.outboundClicks28d,
      impressions_28d: snapshot.impressions28d,
      listing_clicks_28d: snapshot.listingClicks28d,
      smoothed_ctr: snapshot.smoothedCtr,
      reason: snapshot.reason,
    }));

    const { error } = await db
      .from("ranking_snapshots")
      .upsert(rows, { onConflict: "product_id,calculated_on,mode" });
    if (error) throw error;
  }
}
