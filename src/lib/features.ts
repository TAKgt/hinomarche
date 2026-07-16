import type { Product } from "./types";

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
  excludeTitleTerms?: string[];
  selectionGuide?: {
    title: string;
    description: string;
    points: {
      title: string;
      description: string;
    }[];
  };
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
    slug: "charging-accessories",
    eyebrow: "CHARGING ACCESSORIES",
    title: "日本とのかかわりで選ぶ充電ケーブル・充電器",
    shortTitle: "充電ケーブル・充電器",
    description:
      "スマホやタブレットに使う充電ケーブル・充電器を、日本企業や製品情報とのかかわりを示すAI日本度の根拠とともに比較できます。",
    categorySlugs: ["smartphone", "electronics"],
    minScore: 40,
    titleTermGroups: [[
      "充電器",
      "充電ケーブル",
      "ライトニングケーブル",
      "usb-c",
      "タイプc",
    ]],
    excludeTitleTerms: ["ラジオ"],
  },
  {
    slug: "earphones-headphones",
    eyebrow: "PERSONAL AUDIO",
    title: "日本とのかかわりで選ぶイヤホン・ヘッドホン",
    shortTitle: "イヤホン・ヘッドホン",
    description:
      "有線・ワイヤレスのイヤホンやヘッドホンを、日本企業・ブランドや商品情報をもとにしたAI日本度の根拠とともに紹介します。",
    categorySlugs: ["audio-camera"],
    minScore: 40,
    titleTermGroups: [["イヤホン", "ヘッドホン"]],
  },
  {
    slug: "rice-cookers",
    eyebrow: "RICE COOKERS",
    title: "日本とのかかわりで選ぶ炊飯器・炊飯ジャー",
    shortTitle: "炊飯器・炊飯ジャー",
    description:
      "炊飯器や炊飯ジャーを、日本メーカーや生産地に関する商品情報から推定したAI日本度と、価格・販売先レビューから比較できます。",
    categorySlugs: ["electronics"],
    minScore: 70,
    titleTermGroups: [["炊飯器", "炊飯ジャー"]],
  },
  {
    slug: "pc-accessories",
    eyebrow: "DESK & PC ACCESSORIES",
    title: "仕事環境を整えるPC・デスク周辺用品",
    shortTitle: "PC・デスク周辺用品",
    description:
      "PCスタンド、モニター台、入力機器などから、日本とのかかわりを商品情報で確認できる周辺用品をAI日本度の根拠とともに紹介します。",
    categorySlugs: ["computer"],
    minScore: 35,
    titleTermGroups: [[
      "pcスタンド",
      "パソコンスタンド",
      "モニター台",
      "ウェブカメラ",
      "wifi",
      "無線lan",
      "キーボード",
      "マウス",
    ]],
  },
  {
    slug: "gifts-under-5000-yen",
    eyebrow: "GIFT SELECTION",
    title: "5,000円以下で探す手土産・お礼・ギフト",
    shortTitle: "5,000円以下のギフト",
    description:
      "商品名から贈答用途を確認できる5,000円以下の商品を、AI日本度の根拠や販売先レビューとともに比較できます。",
    categorySlugs: ["gift", "tableware", "sweets", "towel", "stationery", "drinks", "food"],
    minScore: 50,
    maxPrice: 5000,
    titleTermGroups: [[
      "ギフト",
      "贈り",
      "プレゼント",
      "手土産",
      "お中元",
      "御中元",
      "お歳暮",
      "内祝い",
      "引き出物",
      "お祝い",
      "お返し",
      "御礼",
      "お礼",
      "ご挨拶",
      "挨拶",
      "木箱",
      "化粧箱",
      "包装済",
      "のし",
    ]],
    excludeTitleTerms: ["お試し", "訳あり", "家庭用"],
    selectionGuide: {
      title: "予算5,000円以内のギフトを選ぶ3つの視点",
      description:
        "表示価格だけで決めず、贈る相手や場面、送料を含む総額、包装・配送条件まで確認すると候補を絞りやすくなります。",
      points: [
        {
          title: "相手と用途を決める",
          description:
            "手土産、日頃のお礼、季節のご挨拶など、贈る場面を先に決めます。好みや家族構成が分かる場合は、内容量や使い切りやすさも比較材料になります。",
        },
        {
          title: "送料を含む総額を見る",
          description:
            "掲載価格に加えて、送料、数量、選択する内容量やオプションによって総額が変わる場合があります。現在の価格と条件は販売ページで確認してください。",
        },
        {
          title: "包装・配送条件を確認する",
          description:
            "のし、包装、手提げ袋、配送日の指定可否は商品ごとに異なります。食品は賞味期限やアレルゲン情報も販売ページで確認してください。",
        },
      ],
    },
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
    excludeTitleTerms: ["コロッケ抜き"],
    selectionGuide: {
      title: "日本製包丁を比べる3つの視点",
      description:
        "価格や販売先レビューだけで決めず、普段切る食材と手入れのしやすさまで確認すると候補を絞りやすくなります。",
      points: [
        {
          title: "用途と形を先に決める",
          description:
            "肉・魚・野菜を1本で扱いたい場合は三徳、小回りを重視する場合は小三徳やペティナイフも比較候補になります。",
        },
        {
          title: "刃渡りと重さを確認する",
          description:
            "同じ三徳包丁でも刃渡りや重さは異なります。収納場所、まな板の大きさ、普段の使い方に合うかを販売ページで確認してください。",
        },
        {
          title: "素材と手入れ方法を見る",
          description:
            "オールステンレスでも食洗機への対応可否は商品ごとに異なります。研ぎ方や日常の手入れに関する説明も比較材料になります。",
        },
      ],
    },
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
    title: "今治タオルギフトを用途・セットで比較",
    shortTitle: "今治タオルのギフト",
    description:
      "商品名に今治の表記があるタオルから、通常購入できるギフト・セット商品をAI日本度の根拠や販売先レビューとともに比較できます。",
    categorySlugs: ["towel", "gift"],
    minScore: 80,
    titleTermGroups: [["今治"], ["ギフト", "贈り", "セット"]],
    excludeTitleTerms: ["ふるさと納税", "枕", "ピロー", "訳あり"],
    selectionGuide: {
      title: "今治タオルギフトを選ぶ3つの視点",
      description:
        "贈る用途、タオルの種類と枚数、送料や包装を含む予算を順に確認すると、候補を比較しやすくなります。",
      points: [
        {
          title: "用途から必要な条件を決める",
          description:
            "内祝い、お礼、ご挨拶など用途により、必要な包装やのしは異なります。自宅用では包装よりも枚数や乾きやすさを優先する選び方もあります。",
        },
        {
          title: "種類・枚数・サイズを見る",
          description:
            "フェイスタオル、バスタオル、両方を組み合わせたセットがあります。同じ名称でも寸法や枚数は異なるため、販売ページの商品仕様を確認してください。",
        },
        {
          title: "総額と包装条件を確認する",
          description:
            "掲載価格に加えて、送料、木箱などの包装、のし、メッセージカードの対応可否も比較材料になります。現在の価格と条件は販売ページで確認してください。",
        },
      ],
    },
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

export function matchesFeatureProduct(
  feature: FeatureDefinition,
  product: Product,
): boolean {
  if (!feature.categorySlugs.includes(product.categorySlug)) return false;
  if (product.score < feature.minScore) return false;
  if (feature.maxPrice != null && (product.price == null || product.price > feature.maxPrice)) {
    return false;
  }

  const normalizedTitle = product.title.toLocaleLowerCase("ja");
  if (
    (feature.excludeTitleTerms ?? []).some((term) =>
      normalizedTitle.includes(term.toLocaleLowerCase("ja")),
    )
  ) {
    return false;
  }
  return (feature.titleTermGroups ?? []).every((group) =>
    group.some((term) => normalizedTitle.includes(term.toLocaleLowerCase("ja"))),
  );
}

export function getFeaturesForCategory(categorySlug: string): FeatureDefinition[] {
  return FEATURES.filter((feature) => feature.categorySlugs.includes(categorySlug));
}

export function getRelatedFeatures(
  current: FeatureDefinition,
  limit = 4,
): FeatureDefinition[] {
  return FEATURES
    .filter((feature) => feature.slug !== current.slug)
    .map((feature, index) => ({
      feature,
      index,
      overlap: feature.categorySlugs.filter((slug) =>
        current.categorySlugs.includes(slug),
      ).length,
    }))
    .sort((a, b) => b.overlap - a.overlap || a.index - b.index)
    .slice(0, limit)
    .map(({ feature }) => feature);
}

export function getFeaturesForProduct(product: Product, limit = 4): FeatureDefinition[] {
  return FEATURES.filter((feature) => matchesFeatureProduct(feature, product)).slice(0, limit);
}
