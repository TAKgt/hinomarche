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
  {
    slug: "tochigi-leather-cases",
    eyebrow: "TOCHIGI LEATHER",
    title: "AI日本度で選ぶ栃木レザーのスマホケース",
    shortTitle: "栃木レザーのスマホケース",
    description:
      "商品名に栃木レザーの表記があるスマホケースを、AI日本度の根拠と注目度を見ながら比較できます。",
    categorySlugs: ["smartphone", "fashion"],
    minScore: 50,
    titleTermGroups: [["栃木レザー"], ["ケース", "カバー"]],
  },
  {
    slug: "japanese-kitchen-knives",
    eyebrow: "KITCHEN KNIVES",
    title: "日本とのかかわりで選ぶ包丁・キッチンナイフ",
    shortTitle: "包丁・キッチンナイフ",
    description:
      "三徳包丁や小型包丁などから、AI日本度80%以上の商品を判定根拠とともに紹介します。",
    categorySlugs: ["kitchen"],
    minScore: 80,
    titleTermGroups: [["包丁", "ナイフ"]],
  },
  {
    slug: "iron-frying-pans",
    eyebrow: "FRYING PANS",
    title: "日本とのかかわりで選ぶ鉄フライパン",
    shortTitle: "鉄フライパン",
    description:
      "鉄製を中心としたフライパンを、メーカーや生産地に関するAI日本度の根拠とともに比較できます。",
    categorySlugs: ["kitchen"],
    minScore: 50,
    titleTermGroups: [["フライパン"]],
  },
  {
    slug: "imabari-towel-gifts",
    eyebrow: "IMABARI GIFTS",
    title: "今治タオルのギフト・セット",
    shortTitle: "今治タオルのギフト",
    description:
      "商品名に今治の表記があるタオルから、ギフトやセット商品をAI日本度の根拠とともに紹介します。",
    categorySlugs: ["towel", "gift"],
    minScore: 80,
    titleTermGroups: [["今治"], ["ギフト", "贈り", "セット"]],
  },
  {
    slug: "japanese-green-tea",
    eyebrow: "JAPANESE TEA",
    title: "産地表示から探す日本茶・緑茶",
    shortTitle: "日本茶・緑茶",
    description:
      "緑茶、日本茶、ほうじ茶、玄米茶などを、産地や原材料に関するAI日本度の根拠とともに紹介します。",
    categorySlugs: ["drinks", "food"],
    minScore: 80,
    titleTermGroups: [["緑茶", "日本茶", "ほうじ茶", "玄米茶"]],
  },
  {
    slug: "regional-japanese-rice",
    eyebrow: "JAPANESE RICE",
    title: "産地表示から探すお米・無洗米",
    shortTitle: "お米・無洗米",
    description:
      "各地のお米や無洗米を、商品情報にある産地とAI日本度の判定根拠を見ながら比較できます。",
    categorySlugs: ["food", "emergency"],
    minScore: 80,
    titleTermGroups: [["お米", "無洗米", "コシヒカリ", "ひとめぼれ", "はえぬき", "さがびより", "つや姫"]],
  },
  {
    slug: "domestic-pet-treats",
    eyebrow: "PET TREATS",
    title: "「国産」表示から探すペットのおやつ",
    shortTitle: "ペットのおやつ",
    description:
      "犬や猫向けのおやつ・フードから、商品名に国産などの情報がある品をAI日本度の根拠とともに紹介します。",
    categorySlugs: ["pet"],
    minScore: 50,
    titleTermGroups: [["おやつ", "ジャーキー", "フード"]],
  },
  {
    slug: "japanese-tools",
    eyebrow: "TOOLS & DIY",
    title: "日本とのかかわりで選ぶ工具・園芸用品",
    shortTitle: "工具・園芸用品",
    description:
      "工具、ペンチ、ニッパー、はさみなどを、メーカーや産地に関するAI日本度の根拠とともに紹介します。",
    categorySlugs: ["diy"],
    minScore: 50,
    titleTermGroups: [["工具", "ニッパー", "ペンチ", "はさみ"]],
  },
];

export function getFeature(slug: string): FeatureDefinition | undefined {
  return FEATURES.find((feature) => feature.slug === slug);
}
