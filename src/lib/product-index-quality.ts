import type { Metadata } from "next";
import { detectJudgmentConsistencyIssues } from "./product-freshness";
import { displayProductTitle } from "./product-title";
import type {
  Judgment,
  Product,
  ProductEditorialEvidence,
  ProductPageData,
  RawProduct,
} from "./types";

export const PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS = 30;
export const PRODUCT_AI_JUDGMENT_MAX_AGE_DAYS = 180;

export type ProductIndexExclusionReason =
  | "last_confirmation_missing"
  | "last_confirmation_stale"
  | "ai_judgment_missing"
  | "ai_judgment_stale"
  | "merchant_reference_missing"
  | "information_inconsistent"
  | "not_for_sale";

export type ProductEditorialExclusionReason =
  | "primary_source_url_missing"
  | "source_excerpt_missing"
  | "source_retrieved_at_missing"
  | "human_verification_missing"
  | "independent_comparison_missing";

export type ProductInformationConsistencyReason =
  | "checks_missing"
  | "year_not_in_source"
  | "number_not_in_source"
  | "manufacturing_origin_conflict"
  | "conflicting_consecutive_year_claim"
  | "conflicting_source_claim"
  | "stored_consistency_blocked"
  | "stored_consistency_issue";

export interface ProductIndexAssessment {
  /** metadataとsitemapが当面使用する安全性ゲート */
  technicalEligible: boolean;
  /** 一次情報台帳・人手確認・独自比較を含む、将来の編集品質ゲート */
  editorialEligible: boolean;
  /** 後方互換。technicalEligibleと同値 */
  indexable: boolean;
  reasons: ProductIndexExclusionReason[];
  editorialReasons: ProductEditorialExclusionReason[];
  lastConfirmedAt: string | null;
  judgedAt: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parsedDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCurrentWithin(date: Date, now: Date, maxAgeDays: number): boolean {
  const age = now.getTime() - date.getTime();
  return age >= -DAY_MS && age <= maxAgeDays * DAY_MS;
}

type ProductIndexCandidate = Product | ProductPageData;

export function isExpectedMerchantUrl(
  product: Pick<ProductIndexCandidate, "affiliateUrl" | "source">,
): boolean {
  try {
    const url = new URL(product.affiliateUrl);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    if (product.source === "amazon") {
      return hostname === "amazon.co.jp" || hostname.endsWith(".amazon.co.jp");
    }
    return (
      hostname === "af.moshimo.com" ||
      hostname === "rakuten.co.jp" ||
      hostname.endsWith(".rakuten.co.jp")
    );
  } catch {
    return false;
  }
}

function isSafePrimarySourceUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function assessProductEditorialQuality(
  evidence: ProductEditorialEvidence | null | undefined,
): {
  eligible: boolean;
  reasons: ProductEditorialExclusionReason[];
} {
  const reasons = new Set<ProductEditorialExclusionReason>();
  if (!isSafePrimarySourceUrl(evidence?.primarySourceUrl)) {
    reasons.add("primary_source_url_missing");
  }
  if (!evidence?.sourceExcerpt?.trim()) {
    reasons.add("source_excerpt_missing");
  }
  if (!parsedDate(evidence?.retrievedAt)) {
    reasons.add("source_retrieved_at_missing");
  }
  if (!parsedDate(evidence?.humanVerifiedAt)) {
    reasons.add("human_verification_missing");
  }
  if (!evidence?.hasIndependentComparison) {
    reasons.add("independent_comparison_missing");
  }
  return { eligible: reasons.size === 0, reasons: [...reasons] };
}

function judgmentHashesMatch(product: ProductIndexCandidate): boolean {
  const current = product.judgmentInputHash ?? null;
  const atJudgment = product.judgmentInputHashAtJudgment ?? null;
  if (current === null && atJudgment === null) return true;
  return current !== null && current === atJudgment;
}

export function productInformationConsistencyIssues(
  product: ProductIndexCandidate,
): ProductInformationConsistencyReason[] {
  const issues = new Set<ProductInformationConsistencyReason>();
  if (product.consistencyStatus === "blocked") {
    issues.add("stored_consistency_blocked");
  }
  if ((product.consistencyIssues?.length ?? 0) > 0) {
    issues.add("stored_consistency_issue");
  }
  if (
    product.score == null ||
    product.tier == null ||
    product.evidenceType == null ||
    !product.evidenceText
  ) {
    return [...issues];
  }
  if (!product.checks) {
    issues.add("checks_missing");
    return [...issues];
  }
  const raw: RawProduct = {
    source: product.source,
    sourceItemId: product.sourceItemId,
    title: product.title,
    description: product.description,
    maker: product.maker,
    brand: product.brand,
    imageUrl: product.imageUrl,
    price: product.price,
    affiliateUrl: product.affiliateUrl,
    itemUrl: product.affiliateUrl,
    categorySlug: product.categorySlug,
    reviewCount: product.reviewCount,
    reviewAverage: product.reviewAverage,
    affiliateRate: product.affiliateRate,
    searchRank: product.searchRank,
  };
  const judgment: Judgment = {
    score: product.score,
    tier: product.tier,
    evidenceType: product.evidenceType,
    evidenceText: product.evidenceText,
    checks: product.checks,
    confidence: "low",
    model: "index-quality-audit",
  };
  for (const issue of detectJudgmentConsistencyIssues(raw, judgment)) {
    issues.add(issue);
  }
  return [...issues];
}

/**
 * 商品URLを残したまま、検索エンジンへ掲載可能かを一元判定する。
 * ページの公開状態やDB行は変更せず、改善後は次回評価で自動復帰する。
 */
export function assessProductIndexQuality(
  product: ProductIndexCandidate,
  now = new Date(),
  editorialEvidence?: ProductEditorialEvidence | null,
): ProductIndexAssessment {
  const reasons = new Set<ProductIndexExclusionReason>();
  const lastConfirmed = parsedDate(product.fetchedAt ?? product.priceUpdatedAt);
  const judged = parsedDate(product.judgedAt);

  if (!lastConfirmed) {
    reasons.add("last_confirmation_missing");
  } else if (
    !isCurrentWithin(
      lastConfirmed,
      now,
      PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS,
    )
  ) {
    reasons.add("last_confirmation_stale");
  }

  if (
    product.judgmentStatus === "blocked" ||
    product.judgmentStatus === "pending" ||
    !judgmentHashesMatch(product)
  ) {
    reasons.add("ai_judgment_stale");
  } else if (
    !judged ||
    product.score == null ||
    product.tier == null ||
    product.evidenceType == null ||
    !product.evidenceText
  ) {
    reasons.add("ai_judgment_missing");
  } else if (
    !isCurrentWithin(judged, now, PRODUCT_AI_JUDGMENT_MAX_AGE_DAYS)
  ) {
    reasons.add("ai_judgment_stale");
  }

  if (
    !product.sourceItemId.trim() ||
    !isExpectedMerchantUrl(product)
  ) {
    reasons.add("merchant_reference_missing");
  }

  if (
    productInformationConsistencyIssues(product).length > 0
  ) {
    reasons.add("information_inconsistent");
  }

  if (
    product.isPublished === false ||
    product.price == null ||
    !Number.isFinite(product.price) ||
    product.price <= 0 ||
    !isExpectedMerchantUrl(product)
  ) {
    reasons.add("not_for_sale");
  }

  const editorial = assessProductEditorialQuality(editorialEvidence);
  const technicalEligible = reasons.size === 0;
  return {
    technicalEligible,
    editorialEligible: editorial.eligible,
    indexable: technicalEligible,
    reasons: [...reasons],
    editorialReasons: editorial.reasons,
    lastConfirmedAt: lastConfirmed?.toISOString() ?? null,
    judgedAt: judged?.toISOString() ?? null,
  };
}

export function buildProductMetadata(
  product: Product,
  now = new Date(),
): Metadata {
  const displayTitle = displayProductTitle(product.title);
  const description = `${displayTitle} — AI日本度判定 ${product.score}%。${product.evidenceText}`;
  const quality = assessProductIndexQuality(product, now);
  const canonical = `/product/${product.id}`;
  return {
    title: displayTitle,
    description,
    alternates: { canonical },
    robots: quality.technicalEligible
      ? undefined
      : { index: false, follow: true },
    openGraph: {
      title: displayTitle,
      description,
      url: canonical,
      type: "website",
      images: product.imageUrl
        ? [{ url: product.imageUrl, alt: displayTitle }]
        : undefined,
    },
  };
}

export interface ProductIndexAuditSummary {
  total: number;
  technicalEligible: number;
  technicalExcluded: number;
  editorialEligible: number;
  primarySourceUnconfirmed: number;
  /** 後方互換 */
  indexable: number;
  excluded: number;
  reasonCounts: Record<ProductIndexExclusionReason, number>;
  editorialReasonCounts: Record<ProductEditorialExclusionReason, number>;
  consistencyIssueCounts: Record<ProductInformationConsistencyReason, number>;
}

const EXCLUSION_REASONS: ProductIndexExclusionReason[] = [
  "last_confirmation_missing",
  "last_confirmation_stale",
  "ai_judgment_missing",
  "ai_judgment_stale",
  "merchant_reference_missing",
  "information_inconsistent",
  "not_for_sale",
];

const CONSISTENCY_REASONS: ProductInformationConsistencyReason[] = [
  "checks_missing",
  "year_not_in_source",
  "number_not_in_source",
  "manufacturing_origin_conflict",
  "conflicting_consecutive_year_claim",
  "conflicting_source_claim",
  "stored_consistency_blocked",
  "stored_consistency_issue",
];

const EDITORIAL_REASONS: ProductEditorialExclusionReason[] = [
  "primary_source_url_missing",
  "source_excerpt_missing",
  "source_retrieved_at_missing",
  "human_verification_missing",
  "independent_comparison_missing",
];

export function summarizeProductIndexQuality(
  products: Product[],
  now = new Date(),
  editorialEvidenceByProductId: ReadonlyMap<
    string,
    ProductEditorialEvidence
  > = new Map(),
): ProductIndexAuditSummary {
  const reasonCounts = Object.fromEntries(
    EXCLUSION_REASONS.map((reason) => [reason, 0]),
  ) as Record<ProductIndexExclusionReason, number>;
  const consistencyIssueCounts = Object.fromEntries(
    CONSISTENCY_REASONS.map((reason) => [reason, 0]),
  ) as Record<ProductInformationConsistencyReason, number>;
  const editorialReasonCounts = Object.fromEntries(
    EDITORIAL_REASONS.map((reason) => [reason, 0]),
  ) as Record<ProductEditorialExclusionReason, number>;
  let technicalEligible = 0;
  let editorialEligible = 0;

  for (const product of products) {
    for (const issue of productInformationConsistencyIssues(product)) {
      consistencyIssueCounts[issue]++;
    }
    const quality = assessProductIndexQuality(
      product,
      now,
      editorialEvidenceByProductId.get(product.id),
    );
    if (quality.technicalEligible) {
      technicalEligible++;
    } else {
      for (const reason of quality.reasons) reasonCounts[reason]++;
    }
    if (quality.editorialEligible) editorialEligible++;
    for (const reason of quality.editorialReasons) {
      editorialReasonCounts[reason]++;
    }
  }

  return {
    total: products.length,
    technicalEligible,
    technicalExcluded: products.length - technicalEligible,
    editorialEligible,
    primarySourceUnconfirmed:
      editorialReasonCounts.primary_source_url_missing,
    indexable: technicalEligible,
    excluded: products.length - technicalEligible,
    reasonCounts,
    editorialReasonCounts,
    consistencyIssueCounts,
  };
}
