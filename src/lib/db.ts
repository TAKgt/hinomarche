import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Category, Judgment, Product, RawProduct, Tier } from "./types";
import { calculateDemandScore, calculateFeaturedScore } from "./market";
import type { CategoryInventory } from "./ingest-plan";
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
    priceUpdatedAt: row.price_updated_at,
    affiliateUrl: row.affiliate_url,
    categorySlug: row.category_slug,
    reviewCount: row.review_count ?? null,
    reviewAverage: row.review_average ?? null,
    affiliateRate: row.affiliate_rate ?? null,
    searchRank: row.search_rank ?? null,
    demandScore: row.demand_score ?? 0,
    featuredScore: row.featured_score ?? row.score ?? 0,
    score: row.score,
    tier: row.tier,
    evidenceType: row.evidence_type,
    evidenceText: row.evidence_text,
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

export async function getCategories(): Promise<Category[]> {
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
}

export type SortKey = "featured" | "score" | "price_asc" | "price_desc" | "new";

function productFeaturedScore(product: Product): number {
  return product.featuredScore ?? calculateFeaturedScore(product.score, product.demandScore ?? 0);
}

function timeValue(value: string | null): number {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function getPublishedProducts(opts: {
  categorySlug?: string;
  sort?: SortKey;
  tier?: Tier;
  limit?: number;
}): Promise<Product[]> {
  const { categorySlug, sort = "featured", tier, limit = 60 } = opts;

  if (isDemoMode()) {
    let items = demoProducts as unknown as Product[];
    if (categorySlug) items = items.filter((p) => p.categorySlug === categorySlug);
    if (tier) items = items.filter((p) => p.tier === tier);
    if (!showLowTier()) items = items.filter((p) => p.tier !== "low");
    items = [...items].sort((a, b) => {
      if (sort === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
      if (sort === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
      if (sort === "new") {
        return timeValue(b.priceUpdatedAt) - timeValue(a.priceUpdatedAt);
      }
      if (sort === "featured") {
        return productFeaturedScore(b) - productFeaturedScore(a) || b.score - a.score;
      }
      return b.score - a.score;
    });
    return items.slice(0, limit);
  }

  let query = publicSupabase()
    .from("products_with_judgment")
    .select("*")
    .eq("is_published", true)
    .limit(limit);
  if (categorySlug) query = query.eq("category_slug", categorySlug);
  if (tier) query = query.eq("tier", tier);
  if (!showLowTier()) query = query.neq("tier", "low");
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else if (sort === "new") query = query.order("created_at", { ascending: false });
  else if (sort === "featured") {
    query = query
      .order("featured_score", { ascending: false })
      .order("demand_score", { ascending: false })
      .order("score", { ascending: false });
  } else query = query.order("score", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data.map(rowToProduct);
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

export async function getSitemapProducts(): Promise<
  { id: string; updatedAt: string | null }[]
> {
  if (isDemoMode()) {
    return (demoProducts as unknown as Product[])
      .filter((product) => showLowTier() || product.tier !== "low")
      .map((product) => ({ id: product.id, updatedAt: product.priceUpdatedAt }));
  }

  const rows: { id: string; price_updated_at: string | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = publicSupabase()
      .from("products_with_judgment")
      .select("id,price_updated_at")
      .eq("is_published", true)
      .order("id", { ascending: true });
    if (!showLowTier()) query = query.neq("tier", "low");
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows.map((row) => ({ id: row.id, updatedAt: row.price_updated_at }));
}

export async function getFeatureProducts(opts: {
  categorySlugs: string[];
  minScore: number;
  maxPrice?: number;
  titleTermGroups?: string[][];
  limit?: number;
}): Promise<Product[]> {
  const { categorySlugs, minScore, maxPrice, titleTermGroups, limit = 24 } = opts;
  const matches = (product: Product) => {
    if (!categorySlugs.includes(product.categorySlug) || product.score < minScore) return false;
    if (maxPrice != null && (product.price == null || product.price > maxPrice)) return false;
    const normalizedTitle = product.title.toLocaleLowerCase("ja");
    return (titleTermGroups ?? []).every((group) =>
      group.some((term) => normalizedTitle.includes(term.toLocaleLowerCase("ja")))
    );
  };

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
  const matches = (product: Product) =>
    product.score >= minScore &&
    titleTerms.some((term) => product.title.includes(term));

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

async function latestJudgmentScore(
  db: SupabaseClient,
  productId: string
): Promise<number | null> {
  const { data, error } = await db
    .from("judgments")
    .select("score")
    .eq("product_id", productId)
    .order("judged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.score ?? null;
}

/** 収集パイプライン用: 商品をupsertし、新規作成ならidを返す(既存なら価格だけ更新してnull) */
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
    .select("id")
    .eq("source", raw.source)
    .eq("source_item_id", raw.sourceItemId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const score = await latestJudgmentScore(db, existing.id);
    const { error } = await db
      .from("products")
      .update({
        price: raw.price,
        price_updated_at: now,
        affiliate_url: raw.affiliateUrl,
        image_url: raw.imageUrl,
        review_count: raw.reviewCount ?? null,
        review_average: raw.reviewAverage ?? null,
        affiliate_rate: raw.affiliateRate ?? null,
        search_rank: raw.searchRank ?? null,
        demand_score: demandScore,
        featured_score: score == null ? 0 : calculateFeaturedScore(score, demandScore),
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return null;
  }

  const { data, error } = await db
    .from("products")
    .insert({
      source: raw.source,
      source_item_id: raw.sourceItemId,
      title: raw.title,
      description: raw.description,
      maker: raw.maker,
      brand: raw.brand,
      image_url: raw.imageUrl,
      price: raw.price,
      price_updated_at: now,
      affiliate_url: raw.affiliateUrl,
      item_url: raw.itemUrl,
      category_slug: raw.categorySlug,
      review_count: raw.reviewCount ?? null,
      review_average: raw.reviewAverage ?? null,
      affiliate_rate: raw.affiliateRate ?? null,
      search_rank: raw.searchRank ?? null,
      demand_score: demandScore,
      featured_score: 0,
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

  const rows: { id: string; category_slug: string; is_published: boolean }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await adminSupabase()
      .from("products")
      .select("id,category_slug,is_published")
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
    else counts.pending++;
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
): Promise<{ id: string; raw: RawProduct }[]> {
  const candidateLimit = Math.max(limit * 20, limit);
  let query = adminSupabase()
    .from("products")
    .select("*")
    .eq("is_published", false)
    .order("featured_score", { ascending: false })
    .order("demand_score", { ascending: false })
    .order("search_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (categorySlugs?.length) query = query.in("category_slug", categorySlugs);
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
export async function saveJudgment(productId: string, j: Judgment): Promise<void> {
  const db = adminSupabase();
  const { error } = await db.from("judgments").insert({
    product_id: productId,
    score: j.score,
    tier: j.tier,
    evidence_type: j.evidenceType,
    evidence_text: j.evidenceText,
    origin_check: j.checks.origin,
    company_check: j.checks.company,
    material_check: j.checks.material,
    confidence: j.confidence,
    model: j.model,
  });
  if (error) throw error;

  const { data: product, error: productErr } = await db
    .from("products")
    .select("demand_score")
    .eq("id", productId)
    .single();
  if (productErr) throw productErr;

  const { error: pubErr } = await db
    .from("products")
    .update({
      is_published: true,
      featured_score: calculateFeaturedScore(j.score, product.demand_score ?? 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  if (pubErr) throw pubErr;
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
  });
  if (error) throw error;
}

export async function recordProductPageView(productId: string): Promise<void> {
  if (isDemoMode()) return;

  const { error } = await adminSupabase().from("product_page_views").insert({
    product_id: productId,
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
      score_version: "commercial-v1",
      current_score: snapshot.currentScore,
      proposed_score: snapshot.proposedScore,
      page_views_28d: snapshot.pageViews28d,
      outbound_clicks_28d: snapshot.outboundClicks28d,
      smoothed_ctr: snapshot.smoothedCtr,
      reason: snapshot.reason,
    }));

    const { error } = await db
      .from("ranking_snapshots")
      .upsert(rows, { onConflict: "product_id,calculated_on,mode" });
    if (error) throw error;
  }
}
