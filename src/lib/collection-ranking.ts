export type CollectionRankingInput = {
  averageFeaturedScore: number;
  productCount: number;
  pageViews28d: number;
  outboundClicks28d: number;
};

export type CollectionRankingResult = {
  shadowScore: number;
  isReady: boolean;
  reason: string;
};

const MIN_INTERACTIONS = 30;
const MIN_CLICKS = 3;
const FULL_CONFIDENCE_INTERACTIONS = 200;
const MAX_BEHAVIOR_WEIGHT = 0.4;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateCollectionRanking(
  input: CollectionRankingInput,
): CollectionRankingResult {
  const productCount = Math.max(1, input.productCount);
  const views = Math.max(0, input.pageViews28d);
  const clicks = Math.max(0, input.outboundClicks28d);
  const interactions = views + clicks;
  const isReady = interactions >= MIN_INTERACTIONS && clicks >= MIN_CLICKS;

  if (!isReady) {
    return {
      shadowScore: Math.round(clamp(input.averageFeaturedScore)),
      isReady: false,
      reason: `データ蓄積中(${interactions}/30反応・${clicks}/3移動)`,
    };
  }

  // 直接CTAの移動も評価できるよう、CTRではなく商品数あたりの反応強度を使う。
  const behaviorPerProduct = (views + clicks * 4) / productCount;
  const behaviorScore = clamp(
    (Math.log1p(behaviorPerProduct) / Math.log1p(20)) * 100,
  );
  const confidence = clamp(interactions / FULL_CONFIDENCE_INTERACTIONS, 0, 1);
  const behaviorWeight = MAX_BEHAVIOR_WEIGHT * confidence;
  const shadowScore =
    input.averageFeaturedScore * (1 - behaviorWeight) + behaviorScore * behaviorWeight;

  return {
    shadowScore: Math.round(clamp(shadowScore)),
    isReady: true,
    reason: `市場性${Math.round(input.averageFeaturedScore)} / 反応${Math.round(behaviorScore)} / 信頼度${Math.round(confidence * 100)}%`,
  };
}
