export type Source = "rakuten" | "amazon";
export type Tier = "high" | "mid" | "low";

export type EvidenceType = "産地表記" | "日本メーカー" | "生産国表記" | "推定";

/** 3要素チェックの判定値: yes=○(確認あり) / unknown=△(不明) / no=✕(海外・該当せず) */
export type CheckResult = "yes" | "unknown" | "no";

/** AI日本度判定の内訳3要素 */
export interface JudgmentChecks {
  /** 生産地: 日本国内で製造されているか */
  origin: CheckResult;
  /** 企業: 日本の企業・ブランドか */
  company: CheckResult;
  /** 素材: 主要な素材・部品が日本のものか */
  material: CheckResult;
}

export interface Category {
  slug: string;
  name: string;
  searchKeywords: string[];
  isActive: boolean;
}

/** 判定済み・表示用の商品(products_with_judgment ビュー相当) */
export interface Product {
  id: string;
  source: Source;
  sourceItemId: string;
  title: string;
  description: string | null;
  maker: string | null;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  priceUpdatedAt: string | null;
  affiliateUrl: string;
  categorySlug: string;
  reviewCount: number | null;
  reviewAverage: number | null;
  affiliateRate: number | null;
  searchRank: number | null;
  demandScore: number;
  featuredScore: number;
  score: number;
  tier: Tier;
  evidenceType: EvidenceType;
  evidenceText: string;
  /** 3要素チェック(古い判定にはないためnull許容) */
  checks: JudgmentChecks | null;
}

/** APIから取得した判定前の商品 */
export interface RawProduct {
  source: Source;
  sourceItemId: string;
  title: string;
  description: string | null;
  maker: string | null;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  affiliateUrl: string;
  itemUrl: string;
  categorySlug: string;
  reviewCount?: number | null;
  reviewAverage?: number | null;
  affiliateRate?: number | null;
  searchRank?: number | null;
}

export interface Judgment {
  score: number;
  tier: Tier;
  evidenceType: EvidenceType;
  evidenceText: string;
  checks: JudgmentChecks;
  confidence: "high" | "mid" | "low";
  model: string;
}

export function tierOf(score: number): Tier {
  if (score >= 80) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export const TIER_LABEL: Record<Tier, string> = {
  high: "高",
  mid: "中",
  low: "低",
};
