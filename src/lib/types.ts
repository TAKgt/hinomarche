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
  /** 販売元APIから商品行を正常取得した日時 */
  fetchedAt: string | null;
  /** AI判定材料(title/description/maker/brand)が最後に変わった日時 */
  contentUpdatedAt: string | null;
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
  /** 現在の商品内容に対するAI判定日時 */
  judgedAt: string | null;
  /** DB上の公開状態。デモデータと旧形式では未定義の場合がある */
  isPublished?: boolean;
  /** 現在の商品内容に対する判定処理の状態 */
  judgmentStatus?: "pending" | "current" | "blocked";
  /** 現在の商品判定入力と判定時入力の対応確認用ハッシュ */
  judgmentInputHash?: string | null;
  judgmentInputHashAtJudgment?: string | null;
  /** 公開前整合性検査。legacyは019適用前の既存判定 */
  consistencyStatus?: "passed" | "blocked" | "legacy";
  consistencyIssues?: string[];
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

export type JudgmentStatus = "pending" | "current" | "blocked";
export type ConsistencyStatus = "passed" | "blocked" | "legacy";

/**
 * 商品詳細URL用の安全な読み取りモデル。
 * pending/blockedでは判定列がnullになり、古い・矛盾したAI判定を表現できない。
 */
export interface ProductPageData {
  id: string;
  source: Source;
  sourceItemId: string;
  title: string;
  description: string | null;
  maker: string | null;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  fetchedAt: string | null;
  contentUpdatedAt: string | null;
  priceUpdatedAt: string | null;
  affiliateUrl: string;
  categorySlug: string;
  reviewCount: number | null;
  reviewAverage: number | null;
  affiliateRate: number | null;
  searchRank: number | null;
  demandScore: number;
  featuredScore: number;
  isPublished: boolean;
  judgmentStatus: JudgmentStatus;
  judgmentInputHash: string | null;
  score: number | null;
  tier: Tier | null;
  evidenceType: EvidenceType | null;
  evidenceText: string | null;
  judgedAt: string | null;
  judgmentInputHashAtJudgment: string | null;
  consistencyStatus: ConsistencyStatus | null;
  consistencyIssues: string[];
  checks: JudgmentChecks | null;
}

/** 将来の一次情報台帳をtechnical index判定と分離して評価するための最小入力。 */
export interface ProductEditorialEvidence {
  primarySourceUrl: string | null;
  sourceExcerpt: string | null;
  retrievedAt: string | null;
  humanVerifiedAt: string | null;
  hasIndependentComparison: boolean;
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
