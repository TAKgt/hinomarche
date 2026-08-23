import {
  EDITORIAL_PRIORITY_THEMES,
  matchesEditorialPriorityTheme,
  type EditorialPriorityThemeId,
} from "./editorial-priority";
import {
  assessProductEditorialQuality,
  assessProductIndexQuality,
} from "./product-index-quality";
import type { ProductEditorialEvidence, ProductPageData } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface IndexRefreshCapacity {
  cronRunsPerDay: number;
  cronMaxDurationSeconds: number;
  categoriesPerRun: number;
  keywordsPerCategory: number;
  resultsPerKeyword: number;
  aiJudgmentsPerDay: number;
}

export interface IndexRefreshPlanOptions {
  horizonDays?: number;
  capacitySafetyRatio?: number;
  focusTheme?: EditorialPriorityThemeId | null;
  capacity?: Partial<IndexRefreshCapacity>;
  editorialEvidenceByProductId?: ReadonlyMap<
    string,
    ProductEditorialEvidence
  >;
}

export interface IndexRefreshPlanSummary {
  scope: "published-products-maintenance";
  horizonDays: number;
  focusTheme: EditorialPriorityThemeId | null;
  population: {
    allProducts: number;
    published: number;
    pendingBacklog: number;
    technicalEligible: number;
    publishedConfirmedWithinHorizon: number;
    publishedConfirmationStale: number;
    publishedAiJudgmentStale: number;
  };
  capacity: IndexRefreshCapacity & {
    theoreticalSearchRowsPerDay: number;
    empiricalUniquePublishedConfirmationsPerDay: number;
    empiricalCapacitySafetyRatio: number;
    safeMaintenanceBudget: number;
  };
  dailyRequirement: {
    allPublished: number;
    currentTechnicalEligible: number;
    maintenanceCohort: number;
  };
  maintenanceCohort: {
    selected: number;
    overflowTechnicalEligible: number;
    byCategory: Record<string, number>;
    byPriorityTheme: Record<EditorialPriorityThemeId, number>;
  };
  risk: {
    allPublishedMaintainableByObservedCoverage: boolean;
    currentTechnicalEligibleWithinObservedCoverage: boolean;
    maintenanceCohortWithinSafetyBudget: boolean;
    cronCompletionVerified: false;
    topThirtyHitCoverageVerified: false;
    previouslyPublishedItemsInsidePendingBacklog: null;
  };
}

const DEFAULT_CAPACITY: IndexRefreshCapacity = {
  cronRunsPerDay: 1,
  cronMaxDurationSeconds: 60,
  categoriesPerRun: 4,
  keywordsPerCategory: 1,
  resultsPerKeyword: 30,
  aiJudgmentsPerDay: 5,
};

function finitePositive(value: number | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

function confirmedWithin(
  product: ProductPageData,
  now: Date,
  horizonDays: number,
): boolean {
  const value = product.fetchedAt ?? product.priceUpdatedAt;
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  const age = now.getTime() - timestamp;
  return age >= -DAY_MS && age <= horizonDays * DAY_MS;
}

function emptyThemeCounts(): Record<EditorialPriorityThemeId, number> {
  return {
    tsubame_kitchen: 0,
    rice_cookers: 0,
    imabari_furusato: 0,
    japanese_tea: 0,
  };
}

function matchesAnyPriorityTheme(product: ProductPageData): boolean {
  return EDITORIAL_PRIORITY_THEMES.some((theme) =>
    matchesEditorialPriorityTheme(product, theme.id),
  );
}

function selectDiverseMaintenanceCohort(
  candidates: ProductPageData[],
  target: number,
  focusTheme: EditorialPriorityThemeId | null,
  editorialEvidenceByProductId: ReadonlyMap<
    string,
    ProductEditorialEvidence
  >,
): ProductPageData[] {
  const priority = (product: ProductPageData) => ({
    focus:
      focusTheme && matchesEditorialPriorityTheme(product, focusTheme) ? 1 : 0,
    editorial: assessProductEditorialQuality(
      editorialEvidenceByProductId.get(product.id),
    ).eligible
      ? 1
      : 0,
    theme: matchesAnyPriorityTheme(product) ? 1 : 0,
  });
  const compare = (left: ProductPageData, right: ProductPageData): number => {
    const leftPriority = priority(left);
    const rightPriority = priority(right);
    return (
      rightPriority.focus - leftPriority.focus ||
      rightPriority.editorial - leftPriority.editorial ||
      rightPriority.theme - leftPriority.theme ||
      right.demandScore - left.demandScore ||
      (right.reviewCount ?? 0) - (left.reviewCount ?? 0) ||
      (left.searchRank ?? Number.MAX_SAFE_INTEGER) -
        (right.searchRank ?? Number.MAX_SAFE_INTEGER) ||
      right.featuredScore - left.featuredScore ||
      left.id.localeCompare(right.id)
    );
  };

  const queues = new Map<string, ProductPageData[]>();
  for (const candidate of [...candidates].sort(compare)) {
    const queue = queues.get(candidate.categorySlug) ?? [];
    queue.push(candidate);
    queues.set(candidate.categorySlug, queue);
  }
  const orderedCategories = [...queues.keys()].sort((left, right) => {
    const leftFirst = queues.get(left)?.[0];
    const rightFirst = queues.get(right)?.[0];
    if (!leftFirst || !rightFirst) return left.localeCompare(right);
    return compare(leftFirst, rightFirst) || left.localeCompare(right);
  });

  const selected: ProductPageData[] = [];
  while (selected.length < target) {
    let added = false;
    for (const category of orderedCategories) {
      const candidate = queues.get(category)?.shift();
      if (!candidate) continue;
      selected.push(candidate);
      added = true;
      if (selected.length >= target) break;
    }
    if (!added) break;
  }
  return selected;
}

/**
 * 外部API・DB・AIを呼ばない、公開商品の30日維持能力のdry-run計画。
 * 戻り値には商品ID・商品名・URLを含めない。
 */
export function planIndexRefresh(
  records: readonly ProductPageData[],
  now = new Date(),
  options: IndexRefreshPlanOptions = {},
): IndexRefreshPlanSummary {
  const horizonDays = Math.max(
    1,
    Math.floor(finitePositive(options.horizonDays, 30)),
  );
  const safetyRatio = Math.min(
    1,
    finitePositive(options.capacitySafetyRatio, 0.8),
  );
  const capacity: IndexRefreshCapacity = {
    cronRunsPerDay: finitePositive(
      options.capacity?.cronRunsPerDay,
      DEFAULT_CAPACITY.cronRunsPerDay,
    ),
    cronMaxDurationSeconds: finitePositive(
      options.capacity?.cronMaxDurationSeconds,
      DEFAULT_CAPACITY.cronMaxDurationSeconds,
    ),
    categoriesPerRun: finitePositive(
      options.capacity?.categoriesPerRun,
      DEFAULT_CAPACITY.categoriesPerRun,
    ),
    keywordsPerCategory: finitePositive(
      options.capacity?.keywordsPerCategory,
      DEFAULT_CAPACITY.keywordsPerCategory,
    ),
    resultsPerKeyword: finitePositive(
      options.capacity?.resultsPerKeyword,
      DEFAULT_CAPACITY.resultsPerKeyword,
    ),
    aiJudgmentsPerDay: finitePositive(
      options.capacity?.aiJudgmentsPerDay,
      DEFAULT_CAPACITY.aiJudgmentsPerDay,
    ),
  };
  const focusTheme = options.focusTheme ?? null;
  const evidenceById =
    options.editorialEvidenceByProductId ?? new Map();
  const published = records.filter((record) => record.isPublished);
  const assessed = published.map((product) => ({
    product,
    assessment: assessProductIndexQuality(
      product,
      now,
      evidenceById.get(product.id),
    ),
  }));
  const technicalEligible = assessed
    .filter(({ assessment }) => assessment.technicalEligible)
    .map(({ product }) => product);
  const confirmed = published.filter((product) =>
    confirmedWithin(product, now, horizonDays),
  ).length;
  const empiricalPerDay = confirmed / horizonDays;
  const safeMaintenanceBudget = Math.min(
    technicalEligible.length,
    Math.floor(confirmed * safetyRatio),
  );
  const selected = selectDiverseMaintenanceCohort(
    technicalEligible,
    safeMaintenanceBudget,
    focusTheme,
    evidenceById,
  );
  const byCategory = new Map<string, number>();
  const byPriorityTheme = emptyThemeCounts();
  for (const product of selected) {
    byCategory.set(
      product.categorySlug,
      (byCategory.get(product.categorySlug) ?? 0) + 1,
    );
    for (const theme of EDITORIAL_PRIORITY_THEMES) {
      if (matchesEditorialPriorityTheme(product, theme.id)) {
        byPriorityTheme[theme.id]++;
      }
    }
  }

  const allPublishedDaily = published.length / horizonDays;
  const technicalDaily = technicalEligible.length / horizonDays;
  const cohortDaily = selected.length / horizonDays;

  return {
    scope: "published-products-maintenance",
    horizonDays,
    focusTheme,
    population: {
      allProducts: records.length,
      published: published.length,
      pendingBacklog: records.filter(
        (record) => record.judgmentStatus === "pending",
      ).length,
      technicalEligible: technicalEligible.length,
      publishedConfirmedWithinHorizon: confirmed,
      publishedConfirmationStale: published.length - confirmed,
      publishedAiJudgmentStale: assessed.filter(({ assessment }) =>
        assessment.reasons.includes("ai_judgment_stale"),
      ).length,
    },
    capacity: {
      ...capacity,
      theoreticalSearchRowsPerDay:
        capacity.cronRunsPerDay *
        capacity.categoriesPerRun *
        capacity.keywordsPerCategory *
        capacity.resultsPerKeyword,
      empiricalUniquePublishedConfirmationsPerDay: rounded(empiricalPerDay),
      empiricalCapacitySafetyRatio: safetyRatio,
      safeMaintenanceBudget,
    },
    dailyRequirement: {
      allPublished: rounded(allPublishedDaily),
      currentTechnicalEligible: rounded(technicalDaily),
      maintenanceCohort: rounded(cohortDaily),
    },
    maintenanceCohort: {
      selected: selected.length,
      overflowTechnicalEligible:
        technicalEligible.length - selected.length,
      byCategory: Object.fromEntries(
        [...byCategory.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      byPriorityTheme,
    },
    risk: {
      allPublishedMaintainableByObservedCoverage:
        allPublishedDaily <= empiricalPerDay,
      currentTechnicalEligibleWithinObservedCoverage:
        technicalDaily <= empiricalPerDay,
      maintenanceCohortWithinSafetyBudget:
        cohortDaily <= empiricalPerDay * safetyRatio,
      cronCompletionVerified: false,
      topThirtyHitCoverageVerified: false,
      previouslyPublishedItemsInsidePendingBacklog: null,
    },
  };
}
