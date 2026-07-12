import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Category, Judgment, Product, RawProduct, Tier } from "./types";
import { calculateDemandScore, calculateFeaturedScore } from "./market";
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

/**
 * 未判定(is_published=false=まだ判定が保存されていない)商品を古い順に取得。
 * 収集時に判定しきれなかったバックログを次回以降のCronで消化するために使う。
 */
export async function getUnjudgedProducts(
  limit: number
): Promise<{ id: string; raw: RawProduct }[]> {
  const { data, error } = await adminSupabase()
    .from("products")
    .select("*")
    .eq("is_published", false)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => ({
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
