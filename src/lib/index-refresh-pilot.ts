import { createHash } from "node:crypto";
import {
  judgmentInputHash,
  planProductRefresh,
} from "./product-freshness";
import { assessProductIndexQuality } from "./product-index-quality";
import type { ProductPageData, RawProduct } from "./types";

export const INDEX_REFRESH_PILOT_CATEGORY = "kitchen";
export const INDEX_REFRESH_PILOT_KEYWORD = "燕三条 調理器具";
export const INDEX_REFRESH_PILOT_MAX_RESULTS = 30;

export type IndexRefreshPilotScope = {
  categorySlug: string;
  keyword: string;
  limit: number;
};

export type IndexRefreshPilotSummary = {
  apiResults: number;
  apiDuplicateRows: number;
  existingMatches: number;
  existingPublishedMatches: number;
  existingUnpublishedMatches: number;
  newCandidates: number;
  outOfScopeExistingMatches: number;
  reconfirmationSuccesses: number;
  unchangedInputs: number;
  inputChanges: number;
  aiRejudgmentCandidates: number;
  technicalRecoveryCandidates: number;
  technicalStillExcluded: number;
  ignoredWithoutCurrentPublicationEvidence: number;
  writeCandidates: number;
  productInsertsPlanned: 0;
  productDeletesPlanned: 0;
  aiCallsPlanned: 0;
  rankingFieldUpdatesPlanned: 0;
  shadowRankingUpdatesPlanned: 0;
};

export type IndexRefreshPilotUpdate = {
  existing: ProductPageData;
  raw: RawProduct;
  inputChanged: boolean;
  technicalRecoveryCandidate: boolean;
};

export type IndexRefreshPilotPlan = {
  scope: IndexRefreshPilotScope;
  summary: IndexRefreshPilotSummary;
  resultFingerprint: string;
  updates: IndexRefreshPilotUpdate[];
};

const pilotKey = (
  value: Pick<RawProduct, "source" | "sourceItemId">,
): string => `${value.source}\u0000${value.sourceItemId}`;

function stableRawFingerprint(raw: RawProduct): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        source: raw.source,
        sourceItemId: raw.sourceItemId,
        inputHash: judgmentInputHash(raw),
        price: raw.price,
        affiliateUrl: raw.affiliateUrl,
        itemUrl: raw.itemUrl,
        reviewCount: raw.reviewCount ?? null,
        reviewAverage: raw.reviewAverage ?? null,
        affiliateRate: raw.affiliateRate ?? null,
        postageIncluded: raw.postageIncluded ?? false,
        saleStartAt: raw.saleStartAt ?? null,
        saleEndAt: raw.saleEndAt ?? null,
        pointRate: raw.pointRate ?? null,
        pointRateStartAt: raw.pointRateStartAt ?? null,
        pointRateEndAt: raw.pointRateEndAt ?? null,
      }),
      "utf8",
    )
    .digest("hex");
}

export function defaultIndexRefreshPilotScope(): IndexRefreshPilotScope {
  return {
    categorySlug: INDEX_REFRESH_PILOT_CATEGORY,
    keyword: INDEX_REFRESH_PILOT_KEYWORD,
    limit: INDEX_REFRESH_PILOT_MAX_RESULTS,
  };
}

export function validateIndexRefreshPilotScope(
  scope: IndexRefreshPilotScope,
): void {
  if (scope.categorySlug !== INDEX_REFRESH_PILOT_CATEGORY) {
    throw new Error("初回pilotのカテゴリは1件に固定されています");
  }
  if (scope.keyword !== INDEX_REFRESH_PILOT_KEYWORD) {
    throw new Error("初回pilotの検索語は1件に固定されています");
  }
  if (
    !Number.isInteger(scope.limit) ||
    scope.limit < 1 ||
    scope.limit > INDEX_REFRESH_PILOT_MAX_RESULTS
  ) {
    throw new Error("pilotの上限は1〜30件で指定してください");
  }
}

function hypotheticalProductAfterRefresh(
  existing: ProductPageData,
  raw: RawProduct,
  now: Date,
): { product: ProductPageData; inputChanged: boolean } {
  const evaluatedAt = now.toISOString();
  const refresh = planProductRefresh(
    {
      source: existing.source,
      title: existing.title,
      description: existing.description,
      maker: existing.maker,
      brand: existing.brand,
      judgmentInputHash: existing.judgmentInputHash,
      contentUpdatedAt: existing.contentUpdatedAt,
      createdAt:
        existing.contentUpdatedAt ??
        existing.fetchedAt ??
        existing.priceUpdatedAt ??
        evaluatedAt,
      isPublished: existing.isPublished,
      judgmentStatus: existing.judgmentStatus,
    },
    raw,
    evaluatedAt,
  );

  return {
    inputChanged: refresh.inputChanged,
    product: {
      ...existing,
      title: raw.title,
      description: raw.description,
      maker: raw.maker,
      brand: raw.brand,
      imageUrl: raw.imageUrl,
      price: raw.price,
      fetchedAt: evaluatedAt,
      priceUpdatedAt: evaluatedAt,
      affiliateUrl: raw.affiliateUrl,
      reviewCount: raw.reviewCount ?? null,
      reviewAverage: raw.reviewAverage ?? null,
      affiliateRate: raw.affiliateRate ?? null,
      contentUpdatedAt: refresh.contentUpdatedAt,
      isPublished: refresh.isPublished,
      judgmentStatus: refresh.judgmentStatus,
      // 内容が同じlegacy行はnull/nullの組を保ち、判定履歴へ書き込まない。
      judgmentInputHash: refresh.inputChanged
        ? refresh.judgmentInputHash
        : existing.judgmentInputHash,
    },
  };
}

/**
 * 外部APIの応答と現在DBを比較する純粋関数。
 * 書き込み候補は「現在公開中の既存商品」だけとし、
 * 新規候補と現在非公開の候補は推測で優先しない。
 */
export function planIndexRefreshPilot(
  records: readonly ProductPageData[],
  fetched: readonly RawProduct[],
  now = new Date(),
  scope = defaultIndexRefreshPilotScope(),
): IndexRefreshPilotPlan {
  validateIndexRefreshPilotScope(scope);
  if (fetched.length > scope.limit) {
    throw new Error("pilotのAPI結果が承認上限を超えました");
  }
  if (
    fetched.some(
      (raw) =>
        raw.source !== "rakuten" || raw.categorySlug !== scope.categorySlug,
    )
  ) {
    throw new Error("pilotの取得結果に対象外の取得元またはカテゴリがあります");
  }

  const recordsByKey = new Map<string, ProductPageData[]>();
  for (const record of records) {
    const key = pilotKey(record);
    const values = recordsByKey.get(key) ?? [];
    values.push(record);
    recordsByKey.set(key, values);
  }
  const rawCounts = new Map<string, number>();
  for (const raw of fetched) {
    const key = pilotKey(raw);
    rawCounts.set(key, (rawCounts.get(key) ?? 0) + 1);
  }
  const apiDuplicateRows = [...rawCounts.values()].reduce(
    (total, count) => total + Math.max(0, count - 1),
    0,
  );

  const uniqueFetched = fetched.filter(
    (raw, index) =>
      fetched.findIndex((candidate) => pilotKey(candidate) === pilotKey(raw)) ===
      index,
  );
  const updates: IndexRefreshPilotUpdate[] = [];
  let existingMatches = 0;
  let existingPublishedMatches = 0;
  let existingUnpublishedMatches = 0;
  let newCandidates = 0;
  let outOfScopeExistingMatches = 0;
  let unchangedInputs = 0;
  let inputChanges = 0;
  let technicalRecoveryCandidates = 0;
  let technicalStillExcluded = 0;

  for (const raw of uniqueFetched) {
    const matches = recordsByKey.get(pilotKey(raw)) ?? [];
    if (matches.length === 0) {
      newCandidates++;
      continue;
    }
    if (matches.length !== 1) {
      throw new Error("pilotの既存商品キーが一意ではありません");
    }
    const existing = matches[0];
    existingMatches++;
    if (existing.categorySlug !== scope.categorySlug) {
      outOfScopeExistingMatches++;
      continue;
    }
    if (!existing.isPublished) {
      existingUnpublishedMatches++;
      continue;
    }
    existingPublishedMatches++;

    const before = assessProductIndexQuality(existing, now);
    const hypothetical = hypotheticalProductAfterRefresh(existing, raw, now);
    const after = assessProductIndexQuality(hypothetical.product, now);
    const technicalRecoveryCandidate =
      !before.technicalEligible && after.technicalEligible;
    if (hypothetical.inputChanged) inputChanges++;
    else unchangedInputs++;
    if (technicalRecoveryCandidate) technicalRecoveryCandidates++;
    else if (!after.technicalEligible) technicalStillExcluded++;
    updates.push({
      existing,
      raw,
      inputChanged: hypothetical.inputChanged,
      technicalRecoveryCandidate,
    });
  }

  const resultFingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        uniqueFetched
          .map((raw) => ({
            key: pilotKey(raw),
            value: stableRawFingerprint(raw),
          }))
          .sort((left, right) => left.key.localeCompare(right.key)),
      ),
      "utf8",
    )
    .digest("hex")
    .slice(0, 24);
  const ignoredWithoutCurrentPublicationEvidence =
    newCandidates + existingUnpublishedMatches + outOfScopeExistingMatches;

  return {
    scope,
    resultFingerprint,
    updates,
    summary: {
      apiResults: fetched.length,
      apiDuplicateRows,
      existingMatches,
      existingPublishedMatches,
      existingUnpublishedMatches,
      newCandidates,
      outOfScopeExistingMatches,
      reconfirmationSuccesses: existingPublishedMatches,
      unchangedInputs,
      inputChanges,
      aiRejudgmentCandidates: inputChanges,
      technicalRecoveryCandidates,
      technicalStillExcluded,
      ignoredWithoutCurrentPublicationEvidence,
      writeCandidates: updates.length,
      productInsertsPlanned: 0,
      productDeletesPlanned: 0,
      aiCallsPlanned: 0,
      rankingFieldUpdatesPlanned: 0,
      shadowRankingUpdatesPlanned: 0,
    },
  };
}

function approvalDigest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex")
    .slice(0, 20)
    .toUpperCase();
}

export function externalPreviewApprovalToken(
  scope: IndexRefreshPilotScope,
): string {
  validateIndexRefreshPilotScope(scope);
  return `INDEX_REFRESH_PREVIEW_${approvalDigest(scope)}`;
}

export function executeIndexRefreshApprovalToken(
  plan: Pick<IndexRefreshPilotPlan, "scope" | "summary" | "resultFingerprint">,
): string {
  return `INDEX_REFRESH_EXECUTE_${approvalDigest({
    scope: plan.scope,
    summary: plan.summary,
    resultFingerprint: plan.resultFingerprint,
  })}`;
}

/**
 * pilotでproductsへ書き込む最小フィールド。
 * カテゴリ、search_rank、demand_score、featured_score、
 * ranking_snapshotsには触れない。AI判定履歴も書き込まない。
 */
export function buildIndexRefreshPilotUpdatePayload(
  existing: ProductPageData,
  raw: RawProduct,
  now = new Date(),
): Record<string, unknown> {
  const evaluatedAt = now.toISOString();
  const refresh = planProductRefresh(
    {
      source: existing.source,
      title: existing.title,
      description: existing.description,
      maker: existing.maker,
      brand: existing.brand,
      judgmentInputHash: existing.judgmentInputHash,
      contentUpdatedAt: existing.contentUpdatedAt,
      createdAt:
        existing.contentUpdatedAt ??
        existing.fetchedAt ??
        existing.priceUpdatedAt ??
        evaluatedAt,
      isPublished: existing.isPublished,
      judgmentStatus: existing.judgmentStatus,
    },
    raw,
    evaluatedAt,
  );
  const payload: Record<string, unknown> = {
    title: raw.title,
    description: raw.description,
    maker: raw.maker,
    brand: raw.brand,
    image_url: raw.imageUrl,
    price: raw.price,
    affiliate_url: raw.affiliateUrl,
    item_url: raw.itemUrl,
    review_count: raw.reviewCount ?? null,
    review_average: raw.reviewAverage ?? null,
    affiliate_rate: raw.affiliateRate ?? null,
    postage_included: raw.postageIncluded ?? false,
    sale_start_at: raw.saleStartAt ?? null,
    sale_end_at: raw.saleEndAt ?? null,
    point_rate: raw.pointRate ?? null,
    point_rate_start_at: raw.pointRateStartAt ?? null,
    point_rate_end_at: raw.pointRateEndAt ?? null,
    promotion_fetched_at: evaluatedAt,
    price_updated_at: evaluatedAt,
    fetched_at: evaluatedAt,
    last_seen_at: evaluatedAt,
    updated_at: evaluatedAt,
  };
  if (refresh.inputChanged) {
    payload.judgment_input_hash = refresh.judgmentInputHash;
    payload.content_updated_at = refresh.contentUpdatedAt;
    payload.judgment_status = "pending";
    payload.is_published = false;
  }
  return payload;
}
