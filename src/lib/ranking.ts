import {
  getShadowRankingInputs,
  saveShadowRankingSnapshots,
  type ShadowRankingInput,
  type ShadowRankingSnapshot,
} from "./db";

const CTR_PRIOR_CLICKS = 1;
const CTR_PRIOR_IMPRESSIONS = 25;
const FULL_CONFIDENCE_IMPRESSIONS = 500;
const MAX_CTR_FOR_SCORE = 0.15;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function daysSince(value: string | null, now: Date): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, (now.getTime() - parsed) / 86_400_000);
}

function japanDate(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function calculateShadowRanking(
  input: ShadowRankingInput,
  now = new Date()
): Omit<ShadowRankingSnapshot, "calculatedOn"> {
  const views = Math.max(0, input.pageViews28d);
  const clicks = Math.max(0, input.outboundClicks28d);
  const impressions = Math.max(0, input.impressions28d);
  const listingClicks = Math.min(
    impressions,
    Math.max(0, input.listingClicks28d),
  );
  const hasListingData = impressions > 0;
  const ctrDenominator = hasListingData ? impressions : views;
  const ctrNumerator = Math.min(
    ctrDenominator,
    hasListingData ? listingClicks : clicks,
  );
  const smoothedCtr =
    (ctrNumerator + CTR_PRIOR_CLICKS) /
    (ctrDenominator + CTR_PRIOR_IMPRESSIONS);
  const ctrScore = clamp((smoothedCtr / MAX_CTR_FOR_SCORE) * 100);
  const confidence = clamp(ctrDenominator / FULL_CONFIDENCE_IMPRESSIONS, 0, 1);

  // 実績が少ない間は市場需要を中心にし、500表示で掲載面CTRの重みが45%に達する。
  let proposedScore =
    input.demandScore * (1 - 0.45 * confidence) + ctrScore * 0.45 * confidence;
  const reasons: string[] = [];

  if (!hasListingData) reasons.push("掲載表示データ待ち");
  else if (impressions < 100) reasons.push("掲載表示データ蓄積中");
  else if (smoothedCtr >= 0.1) reasons.push("掲載面CTRが高い");
  else if (impressions >= 200 && smoothedCtr < 0.03) reasons.push("掲載面CTRが低い");
  else reasons.push("掲載面CTRは標準範囲");

  if (input.aiScore < 50) {
    proposedScore = Math.min(proposedScore, 35);
    reasons.push("AI日本度50未満の上限");
  } else if (input.aiScore < 80) {
    proposedScore = Math.min(proposedScore, 65);
    reasons.push("AI日本度80未満の上限");
  } else {
    reasons.push("AI日本度基準を通過");
  }

  const priceAge = daysSince(input.priceUpdatedAt, now);
  if (priceAge === null || priceAge > 30) {
    proposedScore -= 15;
    reasons.push("価格情報が30日超");
  } else if (priceAge > 14) {
    proposedScore -= 7;
    reasons.push("価格情報が14日超");
  }

  return {
    productId: input.productId,
    currentScore: input.currentFeaturedScore,
    proposedScore: Math.round(clamp(proposedScore)),
    pageViews28d: views,
    outboundClicks28d: clicks,
    impressions28d: impressions,
    listingClicks28d: listingClicks,
    smoothedCtr: Number(smoothedCtr.toFixed(6)),
    reason: reasons.join(" / "),
  };
}

export type ShadowRankingSummary = {
  mode: "shadow";
  calculatedOn: string;
  products: number;
  changedBy10OrMore: number;
};

export async function runShadowRanking(now = new Date()): Promise<ShadowRankingSummary> {
  const calculatedOn = japanDate(now);
  const inputs = await getShadowRankingInputs();
  const snapshots = inputs.map((input) => ({
    ...calculateShadowRanking(input, now),
    calculatedOn,
  }));

  await saveShadowRankingSnapshots(snapshots);

  return {
    mode: "shadow",
    calculatedOn,
    products: snapshots.length,
    changedBy10OrMore: snapshots.filter(
      (snapshot) => Math.abs(snapshot.proposedScore - snapshot.currentScore) >= 10
    ).length,
  };
}
