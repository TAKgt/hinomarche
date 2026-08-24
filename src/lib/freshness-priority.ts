import {
  EDITORIAL_PRIORITY_THEMES,
  matchesEditorialPriorityTheme,
  type EditorialPriorityThemeId,
} from "./editorial-priority";
import {
  assessProductIndexQuality,
  PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS,
} from "./product-index-quality";
import { OPPORTUNITY_MIN_IMPRESSIONS } from "./product-opportunity";
import type { ProductPageData } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const FRESHNESS_PRIORITY_DEFAULT_LIMIT = 30;
export const FRESHNESS_MAINTENANCE_LEAD_DAYS = 7;

export type FreshnessPriorityMetric = {
  productId: string;
  impressions28d: number;
  detailViews28d: number;
  listingOutboundClicks28d: number;
  detailOutboundClicks28d: number;
};

export type FreshnessPriorityStage =
  | "protect_expiring"
  | "recover_observed_demand"
  | "recover_priority_theme"
  | "maintain_due"
  | "recover_demand_proxy";

export type FreshnessPriorityCandidate = {
  product: ProductPageData;
  mode: "recovery" | "maintenance";
  stage: FreshnessPriorityStage;
  confirmationAgeDays: number | null;
  daysUntilTechnicalExpiry: number | null;
  matchedThemes: EditorialPriorityThemeId[];
  metricState: "unavailable" | "unobserved" | "limited" | "mature";
  metrics: Omit<FreshnessPriorityMetric, "productId"> | null;
};

export type FreshnessPriorityOptions = {
  limit?: number;
  maintenanceLeadDays?: number;
  focusTheme?: EditorialPriorityThemeId | null;
  observedMetricDays?: number | null;
  metrics?: readonly FreshnessPriorityMetric[] | null;
};

export type FreshnessPrioritySummary = {
  scope: "published-product-freshness-priority";
  limit: number;
  thresholds: {
    finalConfirmationMaxAgeDays: number;
    maintenanceLeadDays: number;
    matureProductImpressions28d: number;
  };
  population: {
    published: number;
    technicalEligible: number;
    recoveryReady: number;
    maintenanceDue: number;
    staleButNeedsOtherWork: number;
  };
  metrics: {
    status: "available" | "unavailable";
    observedDays: number | null;
    rows: number | null;
    matchedCandidates: number | null;
    selectedWithMatureImpressions: number | null;
    selectedWithOutboundClicks: number | null;
  };
  queue: {
    selected: number;
    recovery: number;
    maintenance: number;
    byStage: Record<FreshnessPriorityStage, number>;
    byCategory: Record<string, number>;
    byPriorityTheme: Record<EditorialPriorityThemeId, number>;
  };
  safeguards: {
    externalProductApiCalls: 0;
    databaseWrites: 0;
    aiCalls: 0;
    rankingFieldUpdates: 0;
    shadowRankingUpdates: 0;
    productIdentifiersInSummary: false;
  };
};

function safeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function confirmationAgeDays(
  product: ProductPageData,
  now: Date,
): number | null {
  const raw = product.fetchedAt ?? product.priceUpdatedAt;
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return null;
  const age = (now.getTime() - timestamp) / DAY_MS;
  return age >= -1 ? age : null;
}

function matchedThemes(product: ProductPageData): EditorialPriorityThemeId[] {
  return EDITORIAL_PRIORITY_THEMES.flatMap((theme) =>
    matchesEditorialPriorityTheme(product, theme.id) ? [theme.id] : [],
  );
}

function emptyStageCounts(): Record<FreshnessPriorityStage, number> {
  return {
    protect_expiring: 0,
    recover_observed_demand: 0,
    recover_priority_theme: 0,
    maintain_due: 0,
    recover_demand_proxy: 0,
  };
}

function emptyThemeCounts(): Record<EditorialPriorityThemeId, number> {
  return {
    tsubame_kitchen: 0,
    rice_cookers: 0,
    imabari_furusato: 0,
    japanese_tea: 0,
  };
}

function metricMap(
  metrics: readonly FreshnessPriorityMetric[] | null | undefined,
): Map<string, Omit<FreshnessPriorityMetric, "productId">> {
  const result = new Map<
    string,
    Omit<FreshnessPriorityMetric, "productId">
  >();
  for (const row of metrics ?? []) {
    const current = result.get(row.productId) ?? {
      impressions28d: 0,
      detailViews28d: 0,
      listingOutboundClicks28d: 0,
      detailOutboundClicks28d: 0,
    };
    result.set(row.productId, {
      impressions28d:
        current.impressions28d + safeNonNegative(row.impressions28d),
      detailViews28d:
        current.detailViews28d + safeNonNegative(row.detailViews28d),
      listingOutboundClicks28d:
        current.listingOutboundClicks28d +
        safeNonNegative(row.listingOutboundClicks28d),
      detailOutboundClicks28d:
        current.detailOutboundClicks28d +
        safeNonNegative(row.detailOutboundClicks28d),
    });
  }
  return result;
}

function candidateStage(
  mode: FreshnessPriorityCandidate["mode"],
  daysUntilTechnicalExpiry: number | null,
  themes: readonly EditorialPriorityThemeId[],
  metrics: FreshnessPriorityCandidate["metrics"],
): FreshnessPriorityStage {
  if (
    mode === "maintenance" &&
    daysUntilTechnicalExpiry !== null &&
    daysUntilTechnicalExpiry <= 2
  ) {
    return "protect_expiring";
  }
  const outboundClicks = metrics
    ? metrics.listingOutboundClicks28d + metrics.detailOutboundClicks28d
    : 0;
  if (
    mode === "recovery" &&
    metrics &&
    (metrics.impressions28d >= OPPORTUNITY_MIN_IMPRESSIONS ||
      metrics.detailViews28d > 0 ||
      outboundClicks > 0)
  ) {
    return "recover_observed_demand";
  }
  if (mode === "recovery" && themes.length > 0) {
    return "recover_priority_theme";
  }
  if (mode === "maintenance") return "maintain_due";
  return "recover_demand_proxy";
}

function stageRank(stage: FreshnessPriorityStage): number {
  switch (stage) {
    case "protect_expiring":
      return 0;
    case "recover_observed_demand":
      return 1;
    case "recover_priority_theme":
      return 2;
    case "maintain_due":
      return 3;
    case "recover_demand_proxy":
      return 4;
  }
}

function compareCandidates(
  left: FreshnessPriorityCandidate,
  right: FreshnessPriorityCandidate,
  focusTheme: EditorialPriorityThemeId | null,
): number {
  const leftMetrics = left.metrics;
  const rightMetrics = right.metrics;
  const leftOutbound = leftMetrics
    ? leftMetrics.listingOutboundClicks28d + leftMetrics.detailOutboundClicks28d
    : 0;
  const rightOutbound = rightMetrics
    ? rightMetrics.listingOutboundClicks28d +
      rightMetrics.detailOutboundClicks28d
    : 0;
  const leftFocus =
    focusTheme && left.matchedThemes.includes(focusTheme) ? 1 : 0;
  const rightFocus =
    focusTheme && right.matchedThemes.includes(focusTheme) ? 1 : 0;
  return (
    stageRank(left.stage) - stageRank(right.stage) ||
    rightFocus - leftFocus ||
    rightOutbound - leftOutbound ||
    (rightMetrics?.impressions28d ?? 0) -
      (leftMetrics?.impressions28d ?? 0) ||
    (rightMetrics?.detailViews28d ?? 0) -
      (leftMetrics?.detailViews28d ?? 0) ||
    (right.confirmationAgeDays ?? Number.MAX_SAFE_INTEGER) -
      (left.confirmationAgeDays ?? Number.MAX_SAFE_INTEGER) ||
    right.product.demandScore - left.product.demandScore ||
    (right.product.reviewCount ?? 0) - (left.product.reviewCount ?? 0) ||
    left.product.id.localeCompare(right.product.id)
  );
}

/**
 * 商品API・DB更新・AI・表示順位の変更をせず、再確認候補だけを選ぶ。
 * metricsが読めない場合は0件とみなさず、既存の需要proxyとテーマで並べる。
 */
export function selectFreshnessPriorityCandidates(
  products: readonly ProductPageData[],
  now = new Date(),
  options: FreshnessPriorityOptions = {},
): FreshnessPriorityCandidate[] {
  const limit = Math.min(
    100,
    Math.max(
      1,
      Math.floor(options.limit ?? FRESHNESS_PRIORITY_DEFAULT_LIMIT),
    ),
  );
  const leadDays = Math.min(
    PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS,
    Math.max(
      1,
      Math.floor(
        options.maintenanceLeadDays ?? FRESHNESS_MAINTENANCE_LEAD_DAYS,
      ),
    ),
  );
  const metricsAvailable =
    options.observedMetricDays != null && options.observedMetricDays > 0;
  const metricsByProduct = metricMap(
    metricsAvailable ? options.metrics : null,
  );
  const candidates: FreshnessPriorityCandidate[] = [];

  for (const product of products) {
    if (!product.isPublished) continue;
    const assessment = assessProductIndexQuality(product, now);
    const ageDays = confirmationAgeDays(product, now);
    const freshnessReasons = new Set([
      "last_confirmation_missing",
      "last_confirmation_stale",
    ]);
    const hasFreshnessProblem = assessment.reasons.some((reason) =>
      freshnessReasons.has(reason),
    );
    const hasOtherProblem = assessment.reasons.some(
      (reason) => !freshnessReasons.has(reason),
    );
    const daysUntilTechnicalExpiry =
      ageDays === null
        ? null
        : PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS - ageDays;
    const mode: FreshnessPriorityCandidate["mode"] | null =
      hasFreshnessProblem && !hasOtherProblem
        ? "recovery"
        : assessment.technicalEligible &&
            daysUntilTechnicalExpiry !== null &&
            daysUntilTechnicalExpiry <= leadDays
          ? "maintenance"
          : null;
    if (!mode) continue;

    const productThemes = matchedThemes(product);
    const row = metricsByProduct.get(product.id) ?? null;
    const metricState: FreshnessPriorityCandidate["metricState"] =
      !metricsAvailable
        ? "unavailable"
        : !row
          ? "unobserved"
          : row.impressions28d >= OPPORTUNITY_MIN_IMPRESSIONS
            ? "mature"
            : "limited";
    candidates.push({
      product,
      mode,
      stage: candidateStage(
        mode,
        daysUntilTechnicalExpiry,
        productThemes,
        row,
      ),
      confirmationAgeDays: ageDays,
      daysUntilTechnicalExpiry,
      matchedThemes: productThemes,
      metricState,
      metrics: row,
    });
  }

  const focusTheme = options.focusTheme ?? null;
  const queues = new Map<string, FreshnessPriorityCandidate[]>();
  for (const candidate of [...candidates].sort((left, right) =>
    compareCandidates(left, right, focusTheme),
  )) {
    const queue = queues.get(candidate.product.categorySlug) ?? [];
    queue.push(candidate);
    queues.set(candidate.product.categorySlug, queue);
  }
  const categoryOrder = [...queues.keys()].sort((left, right) => {
    const leftFirst = queues.get(left)?.[0];
    const rightFirst = queues.get(right)?.[0];
    if (!leftFirst || !rightFirst) return left.localeCompare(right);
    return (
      compareCandidates(leftFirst, rightFirst, focusTheme) ||
      left.localeCompare(right)
    );
  });
  const selected: FreshnessPriorityCandidate[] = [];
  while (selected.length < limit) {
    let added = false;
    for (const category of categoryOrder) {
      const candidate = queues.get(category)?.shift();
      if (!candidate) continue;
      selected.push(candidate);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
  }
  return selected;
}

export function summarizeFreshnessPriorityQueue(
  products: readonly ProductPageData[],
  now = new Date(),
  options: FreshnessPriorityOptions = {},
): FreshnessPrioritySummary {
  const limit = Math.min(
    100,
    Math.max(
      1,
      Math.floor(options.limit ?? FRESHNESS_PRIORITY_DEFAULT_LIMIT),
    ),
  );
  const leadDays = Math.min(
    PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS,
    Math.max(
      1,
      Math.floor(
        options.maintenanceLeadDays ?? FRESHNESS_MAINTENANCE_LEAD_DAYS,
      ),
    ),
  );
  const selected = selectFreshnessPriorityCandidates(products, now, {
    ...options,
    limit,
    maintenanceLeadDays: leadDays,
  });
  const published = products.filter((product) => product.isPublished);
  let technicalEligible = 0;
  let recoveryReady = 0;
  let maintenanceDue = 0;
  let staleButNeedsOtherWork = 0;
  for (const product of published) {
    const assessment = assessProductIndexQuality(product, now);
    if (assessment.technicalEligible) technicalEligible++;
    const freshnessProblem = assessment.reasons.some((reason) =>
      ["last_confirmation_missing", "last_confirmation_stale"].includes(
        reason,
      ),
    );
    const otherProblem = assessment.reasons.some(
      (reason) =>
        !["last_confirmation_missing", "last_confirmation_stale"].includes(
          reason,
        ),
    );
    if (freshnessProblem && otherProblem) staleButNeedsOtherWork++;
    else if (freshnessProblem) recoveryReady++;
    else {
      const ageDays = confirmationAgeDays(product, now);
      if (
        assessment.technicalEligible &&
        ageDays !== null &&
        PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS - ageDays <= leadDays
      ) {
        maintenanceDue++;
      }
    }
  }

  const byStage = emptyStageCounts();
  const byCategory = new Map<string, number>();
  const byPriorityTheme = emptyThemeCounts();
  for (const candidate of selected) {
    byStage[candidate.stage]++;
    byCategory.set(
      candidate.product.categorySlug,
      (byCategory.get(candidate.product.categorySlug) ?? 0) + 1,
    );
    for (const theme of candidate.matchedThemes) byPriorityTheme[theme]++;
  }
  const metricsAvailable =
    options.observedMetricDays != null && options.observedMetricDays > 0;
  const matchedCandidates = metricsAvailable
    ? selected.filter((candidate) => candidate.metrics !== null).length
    : null;
  const selectedWithMatureImpressions = metricsAvailable
    ? selected.filter((candidate) => candidate.metricState === "mature").length
    : null;
  const selectedWithOutboundClicks = metricsAvailable
    ? selected.filter((candidate) => {
        const row = candidate.metrics;
        return (
          row !== null &&
          row.listingOutboundClicks28d + row.detailOutboundClicks28d > 0
        );
      }).length
    : null;

  return {
    scope: "published-product-freshness-priority",
    limit,
    thresholds: {
      finalConfirmationMaxAgeDays:
        PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS,
      maintenanceLeadDays: leadDays,
      matureProductImpressions28d: OPPORTUNITY_MIN_IMPRESSIONS,
    },
    population: {
      published: published.length,
      technicalEligible,
      recoveryReady,
      maintenanceDue,
      staleButNeedsOtherWork,
    },
    metrics: {
      status: metricsAvailable ? "available" : "unavailable",
      observedDays: metricsAvailable ? options.observedMetricDays ?? null : null,
      rows: metricsAvailable ? options.metrics?.length ?? 0 : null,
      matchedCandidates,
      selectedWithMatureImpressions,
      selectedWithOutboundClicks,
    },
    queue: {
      selected: selected.length,
      recovery: selected.filter((candidate) => candidate.mode === "recovery")
        .length,
      maintenance: selected.filter(
        (candidate) => candidate.mode === "maintenance",
      ).length,
      byStage,
      byCategory: Object.fromEntries(
        [...byCategory.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      byPriorityTheme,
    },
    safeguards: {
      externalProductApiCalls: 0,
      databaseWrites: 0,
      aiCalls: 0,
      rankingFieldUpdates: 0,
      shadowRankingUpdates: 0,
      productIdentifiersInSummary: false,
    },
  };
}
