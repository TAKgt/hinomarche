export type CategoryPurposeNavigation<T> = {
  purposeFeatures: T[];
  supplementalFeatures: T[];
};

/**
 * 専用の用途別導線がないカテゴリだけ、既存特集を用途の入口として昇格する。
 * 同じ特集を下段の関連リンクへ重複表示しない。
 */
export function splitCategoryPurposeFeatures<T>(
  hasCommercialTopics: boolean,
  relatedFeatures: readonly T[],
  limit = 2,
): CategoryPurposeNavigation<T> {
  if (hasCommercialTopics || limit <= 0) {
    return {
      purposeFeatures: [],
      supplementalFeatures: [...relatedFeatures],
    };
  }

  const purposeFeatures = relatedFeatures.slice(0, limit);
  return {
    purposeFeatures,
    supplementalFeatures: relatedFeatures.slice(purposeFeatures.length),
  };
}
