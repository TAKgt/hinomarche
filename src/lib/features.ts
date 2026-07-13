export type FeatureDefinition = {
  slug: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  description: string;
  categorySlugs: string[];
  minScore: number;
  maxPrice?: number;
  titleTermGroups?: string[][];
};

export const FEATURES: FeatureDefinition[] = [
  {
    slug: "iphone-cases",
    eyebrow: "SMARTPHONE ACCESSORIES",
    title: "日本とのかかわりで選ぶiPhoneケース",
    shortTitle: "iPhoneケース",
    description:
      "栃木レザーや国内ブランドなど、日本とのかかわりが確認できるiPhoneケースをAI日本度の根拠とともに紹介します。",
    categorySlugs: ["smartphone"],
    minScore: 50,
    titleTermGroups: [["iphone", "アイフォン"], ["ケース", "カバー"]],
  },
  {
    slug: "gifts-under-5000-yen",
    eyebrow: "GIFT SELECTION",
    title: "5,000円以下で探す日本とかかわりのあるギフト",
    shortTitle: "5,000円以下のギフト",
    description:
      "手土産やお礼、ちょっとした贈りものに選びやすい価格帯から、AI日本度50%以上の商品を集めました。",
    categorySlugs: ["gift", "tableware", "sweets", "towel", "stationery", "drinks", "food"],
    minScore: 50,
    maxPrice: 5000,
  },
  {
    slug: "emergency-supplies",
    eyebrow: "PREPAREDNESS",
    title: "日本とのかかわりで選ぶ防災・備蓄用品",
    shortTitle: "防災・備蓄用品",
    description:
      "非常食や保存水、防災用品を中心に、日本国内の産地・企業・素材とのかかわりをAIが推定した商品を紹介します。",
    categorySlugs: ["emergency"],
    minScore: 50,
  },
];

export function getFeature(slug: string): FeatureDefinition | undefined {
  return FEATURES.find((feature) => feature.slug === slug);
}
