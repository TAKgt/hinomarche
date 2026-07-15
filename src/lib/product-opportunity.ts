import type { AdminRankingRow } from "./db";

export const OPPORTUNITY_MIN_IMPRESSIONS = 100;
export const REVIEW_MIN_IMPRESSIONS = 200;
export const SCALE_MIN_CLICKS = 10;
export const SCALE_MIN_SMOOTHED_CTR = 0.1;
export const REVIEW_MAX_SMOOTHED_CTR = 0.03;

export type ProductOpportunityAction = "scale" | "review" | "maintain" | "collect";

export type ProductOpportunity = {
  action: ProductOpportunityAction;
  rawCtr: number | null;
  priority: number;
  reason: string;
};

type OpportunityInput = Pick<
  AdminRankingRow,
  "impressions28d" | "listingClicks28d" | "smoothedCtr"
>;

export function classifyProductOpportunity(input: OpportunityInput): ProductOpportunity {
  const impressions = Math.max(0, input.impressions28d);
  const clicks = Math.min(impressions, Math.max(0, input.listingClicks28d));
  const rawCtr = impressions > 0 ? clicks / impressions : null;

  if (impressions < OPPORTUNITY_MIN_IMPRESSIONS) {
    const remaining = OPPORTUNITY_MIN_IMPRESSIONS - impressions;
    return {
      action: "collect",
      rawCtr,
      priority: impressions,
      reason: `判断まであと${remaining}表示`,
    };
  }

  if (clicks >= SCALE_MIN_CLICKS && input.smoothedCtr >= SCALE_MIN_SMOOTHED_CTR) {
    return {
      action: "scale",
      rawCtr,
      priority: clicks * 10_000 + impressions,
      reason: "十分な表示があり、補正後CTRが10%以上",
    };
  }

  if (impressions >= REVIEW_MIN_IMPRESSIONS && input.smoothedCtr < REVIEW_MAX_SMOOTHED_CTR) {
    return {
      action: "review",
      rawCtr,
      priority: impressions * 10_000 - clicks,
      reason: "200表示以上で、補正後CTRが3%未満",
    };
  }

  return {
    action: "maintain",
    rawCtr,
    priority: impressions,
    reason: "判断可能だが、強化・見直し基準には未到達",
  };
}
