import type { ProductEditorialEvidence } from "./types";

export type ProductEvidenceClaimType =
  | "manufacturing_origin"
  | "company"
  | "material_origin"
  | "regional_brand"
  | "other";

export type ProductEvidenceSourceKind =
  | "manufacturer"
  | "public_body"
  | "regional_body"
  | "seller"
  | "other";

export type ProductEvidenceReviewStatus =
  | "ai_inferred"
  | "human_source_checked";

export interface ProductEvidenceInput {
  productId: string;
  claimType: ProductEvidenceClaimType;
  claimText: string;
  sourceExcerpt: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceKind: ProductEvidenceSourceKind;
  retrievedAt: string | null;
  reviewStatus: ProductEvidenceReviewStatus;
  humanCheckedAt: string | null;
  productInputHash: string;
  evidenceHash: string;
  hasIndependentComparison: boolean;
  isPublic: boolean;
}

export interface ProductEvidenceValidationContext {
  currentProductInputHash: string | null;
  productIsPublished: boolean;
  judgmentStatus: "pending" | "current" | "blocked";
  latestJudgmentConsistencyPassed: boolean;
}

export type ProductEvidenceValidationIssue =
  | "claim_text_invalid"
  | "source_excerpt_invalid"
  | "source_name_invalid"
  | "source_url_invalid"
  | "source_url_not_public"
  | "retrieved_at_invalid"
  | "human_checked_at_invalid"
  | "human_check_incomplete"
  | "product_input_hash_invalid"
  | "evidence_hash_invalid"
  | "public_source_kind_invalid"
  | "public_product_state_invalid"
  | "public_product_hash_mismatch"
  | "public_judgment_not_consistent";

const SHA256_HEX = /^[0-9a-f]{64}$/;
const PRIMARY_SOURCE_KINDS = new Set<ProductEvidenceSourceKind>([
  "manufacturer",
  "public_body",
  "regional_body",
]);

function validDate(value: string | null): boolean {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function privateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return true;
  return (
    octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    octets[0] >= 224
  );
}

function privateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function isSafeEditorialSourceUrl(value: string | null): boolean {
  if (!value || value.length > 2048 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      return false;
    }
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      privateIpv4(hostname) ||
      privateIpv6(hostname)
    ) {
      return false;
    }
    return hostname.includes(".");
  } catch {
    return false;
  }
}

export function validateProductEvidenceInput(
  input: ProductEvidenceInput,
  context: ProductEvidenceValidationContext,
): ProductEvidenceValidationIssue[] {
  const issues = new Set<ProductEvidenceValidationIssue>();
  const claimText = input.claimText.trim();
  const excerpt = input.sourceExcerpt?.trim() ?? "";
  const sourceName = input.sourceName?.trim() ?? "";

  if (claimText.length < 1 || claimText.length > 300) {
    issues.add("claim_text_invalid");
  }
  if (input.sourceExcerpt !== null && (excerpt.length < 1 || excerpt.length > 1000)) {
    issues.add("source_excerpt_invalid");
  }
  if (input.sourceName !== null && (sourceName.length < 1 || sourceName.length > 160)) {
    issues.add("source_name_invalid");
  }
  if (input.sourceUrl !== null && !isSafeEditorialSourceUrl(input.sourceUrl)) {
    issues.add("source_url_invalid");
    issues.add("source_url_not_public");
  }
  if (input.retrievedAt !== null && !validDate(input.retrievedAt)) {
    issues.add("retrieved_at_invalid");
  }
  if (input.humanCheckedAt !== null && !validDate(input.humanCheckedAt)) {
    issues.add("human_checked_at_invalid");
  }
  if (!SHA256_HEX.test(input.productInputHash)) {
    issues.add("product_input_hash_invalid");
  }
  if (!SHA256_HEX.test(input.evidenceHash)) {
    issues.add("evidence_hash_invalid");
  }

  if (input.reviewStatus === "ai_inferred") {
    if (input.humanCheckedAt !== null) issues.add("human_check_incomplete");
  } else {
    if (
      !input.sourceUrl ||
      !sourceName ||
      !excerpt ||
      !validDate(input.retrievedAt) ||
      !validDate(input.humanCheckedAt) ||
      new Date(input.retrievedAt!).getTime() > new Date(input.humanCheckedAt!).getTime()
    ) {
      issues.add("human_check_incomplete");
    }
  }

  if (input.isPublic) {
    if (
      input.reviewStatus !== "human_source_checked" ||
      !PRIMARY_SOURCE_KINDS.has(input.sourceKind)
    ) {
      issues.add("public_source_kind_invalid");
    }
    if (!context.productIsPublished || context.judgmentStatus !== "current") {
      issues.add("public_product_state_invalid");
    }
    if (
      context.currentProductInputHash === null ||
      context.currentProductInputHash !== input.productInputHash
    ) {
      issues.add("public_product_hash_mismatch");
    }
    if (!context.latestJudgmentConsistencyPassed) {
      issues.add("public_judgment_not_consistent");
    }
  }

  return [...issues];
}

export function toProductEditorialEvidence(
  input: ProductEvidenceInput,
): ProductEditorialEvidence {
  const primarySource =
    input.reviewStatus === "human_source_checked" &&
    PRIMARY_SOURCE_KINDS.has(input.sourceKind) &&
    isSafeEditorialSourceUrl(input.sourceUrl);
  return {
    primarySourceUrl: primarySource ? input.sourceUrl : null,
    sourceExcerpt: primarySource ? input.sourceExcerpt : null,
    retrievedAt: primarySource ? input.retrievedAt : null,
    humanVerifiedAt: primarySource ? input.humanCheckedAt : null,
    hasIndependentComparison:
      primarySource && input.hasIndependentComparison,
  };
}
