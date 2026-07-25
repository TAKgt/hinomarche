import {
  assessProductIndexQuality,
  productInformationConsistencyIssues,
  type ProductEditorialExclusionReason,
  type ProductIndexExclusionReason,
  type ProductInformationConsistencyReason,
} from "./product-index-quality";
import { currentProductFromPage } from "./product-page-resolution";
import type {
  ProductEditorialEvidence,
  ProductPageData,
} from "./types";

const TECHNICAL_REASONS: ProductIndexExclusionReason[] = [
  "last_confirmation_missing",
  "last_confirmation_stale",
  "ai_judgment_missing",
  "ai_judgment_stale",
  "merchant_reference_missing",
  "information_inconsistent",
  "not_for_sale",
];

const EDITORIAL_REASONS: ProductEditorialExclusionReason[] = [
  "primary_source_url_missing",
  "source_excerpt_missing",
  "source_retrieved_at_missing",
  "human_verification_missing",
  "independent_comparison_missing",
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

export interface ProductPopulationAuditSummary {
  productsTotal: number;
  publication: { published: number; unpublished: number };
  judgmentStatus: { current: number; pending: number; blocked: number };
  currentHashMatched: number;
  currentLegacyWithoutHash: number;
  publicUrl200: number;
  notFoundEquivalent: number;
  sitemapEligible: number;
  technicalEligible: number;
  technicalExcluded: number;
  editorialEligible: number;
  primarySourceUnconfirmed: number;
  technicalReasonCounts: Record<ProductIndexExclusionReason, number>;
  editorialReasonCounts: Record<ProductEditorialExclusionReason, number>;
  consistencyIssueCounts: Record<ProductInformationConsistencyReason, number>;
}

export function summarizeProductPopulation(
  records: ProductPageData[],
  now = new Date(),
  options: {
    includeLowTier?: boolean;
    safePendingUrlsEnabled?: boolean;
    editorialEvidenceByProductId?: ReadonlyMap<
      string,
      ProductEditorialEvidence
    >;
  } = {},
): ProductPopulationAuditSummary {
  const includeLowTier = options.includeLowTier ?? true;
  const safePendingUrlsEnabled =
    options.safePendingUrlsEnabled ?? true;
  const evidenceById = options.editorialEvidenceByProductId ?? new Map();
  const technicalReasonCounts = Object.fromEntries(
    TECHNICAL_REASONS.map((reason) => [reason, 0]),
  ) as Record<ProductIndexExclusionReason, number>;
  const editorialReasonCounts = Object.fromEntries(
    EDITORIAL_REASONS.map((reason) => [reason, 0]),
  ) as Record<ProductEditorialExclusionReason, number>;
  const consistencyIssueCounts = Object.fromEntries(
    CONSISTENCY_REASONS.map((reason) => [reason, 0]),
  ) as Record<ProductInformationConsistencyReason, number>;
  const summary: ProductPopulationAuditSummary = {
    productsTotal: records.length,
    publication: { published: 0, unpublished: 0 },
    judgmentStatus: { current: 0, pending: 0, blocked: 0 },
    currentHashMatched: 0,
    currentLegacyWithoutHash: 0,
    publicUrl200: 0,
    notFoundEquivalent: 0,
    sitemapEligible: 0,
    technicalEligible: 0,
    technicalExcluded: 0,
    editorialEligible: 0,
    primarySourceUnconfirmed: 0,
    technicalReasonCounts,
    editorialReasonCounts,
    consistencyIssueCounts,
  };

  for (const record of records) {
    summary.publication[record.isPublished ? "published" : "unpublished"]++;
    summary.judgmentStatus[record.judgmentStatus]++;

    if (
      record.judgmentStatus === "current" &&
      record.judgmentInputHash !== null &&
      record.judgmentInputHash === record.judgmentInputHashAtJudgment
    ) {
      summary.currentHashMatched++;
    } else if (
      record.judgmentStatus === "current" &&
      record.judgmentInputHash === null &&
      record.judgmentInputHashAtJudgment === null
    ) {
      summary.currentLegacyWithoutHash++;
    }

    const hiddenLowTier =
      !includeLowTier &&
      record.judgmentStatus === "current" &&
      record.tier === "low";
    const current = currentProductFromPage(record);
    if (
      !hiddenLowTier &&
      (safePendingUrlsEnabled ||
        (record.isPublished && current !== null))
    ) {
      summary.publicUrl200++;
    }

    for (const issue of productInformationConsistencyIssues(record)) {
      consistencyIssueCounts[issue]++;
    }

    const assessment = assessProductIndexQuality(
      record,
      now,
      evidenceById.get(record.id),
    );
    if (assessment.technicalEligible) {
      summary.technicalEligible++;
      if (current && record.isPublished && !hiddenLowTier) {
        summary.sitemapEligible++;
      }
    } else {
      for (const reason of assessment.reasons) {
        technicalReasonCounts[reason]++;
      }
    }
    if (assessment.editorialEligible) summary.editorialEligible++;
    for (const reason of assessment.editorialReasons) {
      editorialReasonCounts[reason]++;
    }
  }

  summary.notFoundEquivalent = records.length - summary.publicUrl200;
  summary.technicalExcluded =
    records.length - summary.technicalEligible;
  summary.primarySourceUnconfirmed =
    editorialReasonCounts.primary_source_url_missing;
  return summary;
}
