export type CommercialTopic = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  categorySlugs: string[];
};

export const COMMERCIAL_TOPICS: CommercialTopic[] = [
  {
    slug: "knives-tsubame",
    eyebrow: "KITCHEN & CRAFT",
    title: "包丁・燕三条",
    description:
      "三徳包丁などを用途・予算・販売先レビュー・商品情報にある産地の根拠から比較できます。",
    href: "/feature/japanese-kitchen-knives",
    linkLabel: "包丁3候補を比較する",
    secondaryHref: "/region/tsubame-sanjo",
    secondaryLabel: "燕三条の道具を見る",
    categorySlugs: ["kitchen", "tableware"],
  },
  {
    slug: "imabari-gifts",
    eyebrow: "IMABARI GIFTS",
    title: "今治タオル・ギフト",
    description:
      "お礼、内祝い、自宅用を分け、価格・セット内容・販売先レビュー・今治の表記から比較できます。",
    href: "/feature/imabari-towel-gifts",
    linkLabel: "今治タオル3候補を比較する",
    secondaryHref: "/region/imabari",
    secondaryLabel: "今治の用途別一覧を見る",
    categorySlugs: ["towel", "gift"],
  },
  {
    slug: "gifts-under-5000",
    eyebrow: "GIFT BY BUDGET",
    title: "5,000円以下のギフト",
    description:
      "手土産やお礼の候補を3つの価格帯に分け、送料・包装の確認点と一緒に比較できます。",
    href: "/feature/gifts-under-5000-yen",
    linkLabel: "予算別の3候補を比較する",
    categorySlugs: ["gift", "tableware", "sweets", "towel", "stationery", "drinks", "food"],
  },
];

export function getCommercialTopicsForCategory(categorySlug: string): CommercialTopic[] {
  return COMMERCIAL_TOPICS.filter((topic) => topic.categorySlugs.includes(categorySlug));
}
