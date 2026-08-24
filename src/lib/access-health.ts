import { assessProductIndexQuality } from "./product-index-quality";
import type { FreshnessPriorityMetric } from "./freshness-priority";
import type { ProductPageData } from "./types";

export const ACCESS_REVIEW_MIN_IMPRESSIONS = 200;
export const ACCESS_REVIEW_MIN_DETAIL_VIEWS = 50;
export const ACCESS_REVIEW_MIN_OUTBOUND_CLICKS = 10;

export type AccessFunnelSnapshot = {
  observedDays: number;
  rows: readonly FreshnessPriorityMetric[];
};

export type AccessHealthSummary = {
  scope: "access-health-read-only";
  status: "ok" | "warning";
  productFreshness: {
    status: "ok" | "warning";
    published: number;
    technicalEligible: number;
    technicalCoverageRatio: number | null;
    confirmationStale: number;
    staleWithOtherQualityIssues: number;
  };
  onsiteFunnel: {
    status: "ready" | "collecting" | "unavailable";
    observedDays: number | null;
    impressions28d: number | null;
    detailViews28d: number | null;
    outboundClicks28d: number | null;
    thresholds: {
      impressions: number;
      detailViews: number;
      outboundClicks: number;
    };
  };
  externalMeasurement: {
    searchConsole: "not-read-by-local-command";
    ga4: "not-read-by-local-command";
    coreWebVitals: "not-read-by-local-command";
    unavailableValuesAreZero: false;
  };
  execution: {
    externalProductApiCalls: 0;
    databaseWrites: 0;
    aiCalls: 0;
    rankingFieldUpdates: 0;
  };
};

function roundedRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Number((numerator / denominator).toFixed(4));
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * DBの匿名集計だけで、鮮度とサイト内ファネルの観測可能性を確認する。
 * Search Console・GA4・CWVはこのローカルコマンドから推測せず、未取得のまま返す。
 */
export function summarizeAccessHealth(
  products: readonly ProductPageData[],
  funnel: AccessFunnelSnapshot | null,
  now = new Date(),
): AccessHealthSummary {
  const published = products.filter((product) => product.isPublished);
  let technicalEligible = 0;
  let confirmationStale = 0;
  let staleWithOtherQualityIssues = 0;
  for (const product of published) {
    const assessment = assessProductIndexQuality(product, now);
    if (assessment.technicalEligible) technicalEligible++;
    const stale = assessment.reasons.some((reason) =>
      ["last_confirmation_missing", "last_confirmation_stale"].includes(
        reason,
      ),
    );
    if (stale) confirmationStale++;
    if (
      stale &&
      assessment.reasons.some(
        (reason) =>
          !["last_confirmation_missing", "last_confirmation_stale"].includes(
            reason,
          ),
      )
    ) {
      staleWithOtherQualityIssues++;
    }
  }

  const funnelAvailable = funnel !== null && funnel.observedDays > 0;
  const funnelTotals = funnelAvailable
    ? funnel.rows.reduce(
        (total, row) => ({
          impressions:
            total.impressions + safeCount(row.impressions28d),
          detailViews:
            total.detailViews + safeCount(row.detailViews28d),
          outboundClicks:
            total.outboundClicks +
            safeCount(row.listingOutboundClicks28d) +
            safeCount(row.detailOutboundClicks28d),
        }),
        { impressions: 0, detailViews: 0, outboundClicks: 0 },
      )
    : null;
  const funnelReady =
    funnelTotals !== null &&
    funnelTotals.impressions >= ACCESS_REVIEW_MIN_IMPRESSIONS &&
    funnelTotals.detailViews >= ACCESS_REVIEW_MIN_DETAIL_VIEWS &&
    funnelTotals.outboundClicks >= ACCESS_REVIEW_MIN_OUTBOUND_CLICKS;
  const freshnessStatus =
    confirmationStale === 0 && published.length > 0 ? "ok" : "warning";

  return {
    scope: "access-health-read-only",
    status:
      freshnessStatus === "ok" && funnelReady ? "ok" : "warning",
    productFreshness: {
      status: freshnessStatus,
      published: published.length,
      technicalEligible,
      technicalCoverageRatio: roundedRatio(
        technicalEligible,
        published.length,
      ),
      confirmationStale,
      staleWithOtherQualityIssues,
    },
    onsiteFunnel: {
      status: !funnelAvailable
        ? "unavailable"
        : funnelReady
          ? "ready"
          : "collecting",
      observedDays: funnelAvailable ? funnel.observedDays : null,
      impressions28d: funnelTotals?.impressions ?? null,
      detailViews28d: funnelTotals?.detailViews ?? null,
      outboundClicks28d: funnelTotals?.outboundClicks ?? null,
      thresholds: {
        impressions: ACCESS_REVIEW_MIN_IMPRESSIONS,
        detailViews: ACCESS_REVIEW_MIN_DETAIL_VIEWS,
        outboundClicks: ACCESS_REVIEW_MIN_OUTBOUND_CLICKS,
      },
    },
    externalMeasurement: {
      searchConsole: "not-read-by-local-command",
      ga4: "not-read-by-local-command",
      coreWebVitals: "not-read-by-local-command",
      unavailableValuesAreZero: false,
    },
    execution: {
      externalProductApiCalls: 0,
      databaseWrites: 0,
      aiCalls: 0,
      rankingFieldUpdates: 0,
    },
  };
}
