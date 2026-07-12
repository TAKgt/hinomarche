/**
 * TOP掲載用の市場性スコア。
 * 売上数そのものは各モールAPIから取得できないため、検索順位・レビュー量・評価・料率を
 * 「売れ筋/人気/紹介価値」の近似シグナルとして扱う。
 */

export interface MarketSignals {
  searchRank?: number | null;
  reviewCount?: number | null;
  reviewAverage?: number | null;
  affiliateRate?: number | null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function searchRankScore(rank: number): number {
  // 1位=100、30位=42。API検索結果の上位ほど需要/関連度が高いものとして扱う。
  return clampScore(100 - (Math.max(1, rank) - 1) * 2);
}

function reviewCountScore(count: number): number {
  // レビュー数はロングテールなので対数でならす。1000件以上は満点扱い。
  return clampScore((Math.log10(Math.max(0, count) + 1) / Math.log10(1001)) * 100);
}

function reviewAverageScore(average: number): number {
  // 3.5未満は低評価、4.8以上は十分強い評価として扱う。
  return clampScore(((average - 3.5) / 1.3) * 100);
}

function affiliateRateScore(rate: number): number {
  // 料率は収益性の近似。10%以上は満点扱いにして極端値の影響を抑える。
  return clampScore((Math.max(0, rate) / 10) * 100);
}

export function calculateDemandScore(signals: MarketSignals): number {
  const weighted: { score: number; weight: number }[] = [];

  if (signals.searchRank && signals.searchRank > 0) {
    weighted.push({ score: searchRankScore(signals.searchRank), weight: 0.4 });
  }
  if (signals.reviewCount != null && signals.reviewCount >= 0) {
    weighted.push({ score: reviewCountScore(signals.reviewCount), weight: 0.35 });
  }
  if (signals.reviewAverage != null && signals.reviewAverage > 0) {
    weighted.push({ score: reviewAverageScore(signals.reviewAverage), weight: 0.15 });
  }
  if (signals.affiliateRate != null && signals.affiliateRate > 0) {
    weighted.push({ score: affiliateRateScore(signals.affiliateRate), weight: 0.1 });
  }

  if (weighted.length === 0) return 0;
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  return clampScore(
    weighted.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight
  );
}

export function calculateFeaturedScore(japanScore: number, demandScore: number): number {
  // AI日本度を主軸にしつつ、TOPでは売れ筋度が低い商品を下げる。
  const base = japanScore * 0.65 + demandScore * 0.35;
  const tierPenalty = japanScore >= 80 ? 0 : japanScore >= 50 ? 15 : 35;
  return clampScore(base - tierPenalty);
}
