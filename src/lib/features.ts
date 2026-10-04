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
    officialLinks?: {
      href: string;
      label: string;
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
      "栃木レザーや国内ブランドなど、日本とのかかわりを商品情報で確認できるiPhoneケースを紹介します。AI日本度と判定根拠も掲載しています。",
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
      "スマホやタブレット用の充電ケーブル・充電器を比較できます。日本企業とのかかわりなど、商品情報をもとにしたAI日本度の判定根拠を掲載しています。",
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
      "有線・ワイヤレスのイヤホンやヘッドホンを紹介します。日本企業やブランドなどの商品情報をもとにしたAI日本度と、判定根拠を掲載しています。",
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
      "炊飯器や炊飯ジャーを、価格・販売先レビュー・AI日本度から比較できます。AI日本度は、メーカーや生産地の商品情報をもとにした推定です。",
    categorySlugs: ["electronics"],
    minScore: 70,
    titleTermGroups: [["炊飯器", "炊飯ジャー"]],
    selectionGuide: {
      title: "炊飯器・炊飯鍋の容量・熱源を確認する",
      description:
        "電気炊飯器は容量と加熱方式、炊飯鍋は容量と対応熱源を確認してください。生産国はメーカー名だけで判断せず、販売ページや仕様表で確かめてください。",
      points: [
        {
          title: "日本メーカーと生産国を分ける",
          description:
            "日本メーカーの商品でも、生産国は機種によって異なる場合があります。AI日本度は商品情報からの推定です。正確な生産国は販売ページやメーカーの仕様表で確認してください。",
        },
        {
          title: "電気炊飯器は容量と加熱方式を確認",
          description:
            "普段、一度に炊く量に合う容量を確認します。加熱方式にはIH、圧力IH、マイコンなどがあるため、商品ごとの仕様を確かめてください。",
        },
        {
          title: "炊飯鍋は容量と対応熱源を確認",
          description:
            "3合、5合などの容量に加え、ガス火・IHへの対応、寸法、手入れ方法を販売ページで確認してください。",
        },
      ],
      officialLinks: [
        {
          href: "https://panasonic.jp/suihan/select.html",
          label: "パナソニック公式「炊飯器の選び方」",
        },
        {
          href: "https://www.tiger-corporation.com/ja/jpn/product/rice-cooker-comparison/",
          label: "タイガー魔法瓶公式「炊飯器 仕様比較」",
        },
      ],
    },
  },
  {
    slug: "pc-accessories",
    eyebrow: "DESK & PC ACCESSORIES",
    title: "仕事環境を整えるPC・デスク周辺用品",
    shortTitle: "PC・デスク周辺用品",
    description:
      "PCスタンド、モニター台、入力機器などの周辺用品を紹介します。日本とのかかわりを商品情報で確認できる品を、AI日本度の判定根拠とともに掲載しています。",
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
    slug: "japanese-gift-ideas",
    eyebrow: "GIFT IDEAS",
    title: "贈りものに選びたい日本の品",
    shortTitle: "贈りものに選びたい品",
    description:
      "お礼、お祝い、季節のご挨拶に選びやすい品を紹介します。価格や販売先レビューに加え、AI日本度の判定根拠も確認できます。",
    categorySlugs: ["gift", "tableware", "sweets", "towel", "stationery", "drinks", "food"],
    minScore: 50,
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
      "包装",
      "のし",
    ]],
    excludeTitleTerms: ["ふるさと納税", "訳あり", "家庭用", "お試し"],
  },
  {
    slug: "gifts-under-5000-yen",
    eyebrow: "GIFT SELECTION",
    title: "5,000円以下で探す手土産・お礼・ギフト",
    shortTitle: "5,000円以下のギフト",
    description:
      "商品名に贈答用途の記載がある、5,000円以下の商品を比較できます。AI日本度の判定根拠や販売先レビューも確認できます。",
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
      title: "5,000円以内に収めるための送料・包装の確認",
      description:
        "贈る相手や場面に加え、送料を含む総額、包装・配送条件を確認すると候補を絞りやすくなります。",
      points: [
        {
          title: "相手と用途を決める",
          description:
            "手土産、日頃のお礼、季節のご挨拶など、贈る場面を先に決めます。相手の好みや家族構成が分かれば、内容量や使い切りやすさも比べられます。",
        },
        {
          title: "送料を含む総額を見る",
          description:
            "送料や数量、選ぶ内容量、オプションによって総額が変わる場合があります。現在の価格と条件は販売ページで確認してください。",
        },
        {
          title: "包装・配送条件を確認する",
          description:
            "のし、包装、手提げ袋、配送日の指定に対応しているかは商品ごとに異なります。食品は賞味期限とアレルゲン情報も販売ページで確認してください。",
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
      "非常食や保存水などの防災・備蓄用品を紹介します。国内の産地・企業・素材とのかかわりを、AIが商品情報から推定しています。",
    categorySlugs: ["emergency"],
    minScore: 50,
  },
  {
    slug: "tochigi-leather-cases",
    eyebrow: "TOCHIGI LEATHER",
    title: "AI日本度で選ぶ栃木レザーのスマホケース",
    shortTitle: "栃木レザーのスマホケース",
    description:
      "商品名に「栃木レザー」と記載されたスマホケースを比較できます。AI日本度の判定根拠と、商品の注目度を確認できます。",
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
      "三徳包丁や小型包丁など、AI日本度80%以上の包丁を紹介します。スコアはAI推定で、商品ごとの判定根拠も掲載しています。",
    categorySlugs: ["kitchen"],
    minScore: 80,
    titleTermGroups: [["包丁", "ナイフ"]],
    excludeTitleTerms: ["コロッケ抜き"],
    selectionGuide: {
      title: "包丁の用途・刃渡り・手入れ方法を比べる",
      description:
        "価格や販売先レビューに加え、普段切る食材と手入れのしやすさを確認すると、候補を絞りやすくなります。",
      points: [
        {
          title: "用途と形を先に決める",
          description:
            "肉・魚・野菜に1本で使いたい場合は三徳包丁が候補になります。小回りを重視するなら、小三徳やペティナイフも比較できます。",
        },
        {
          title: "刃渡りと重さを確認する",
          description:
            "同じ三徳包丁でも、刃渡りや重さは異なります。収納場所やまな板の大きさ、普段の使い方に合うか、販売ページで確認してください。",
        },
        {
          title: "素材と手入れ方法を見る",
          description:
            "オールステンレスの包丁でも、食洗機で洗えるかは商品によって異なります。研ぎ方や日常の手入れ方法も確認すると比べやすくなります。",
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
      "鉄製を中心にフライパンを比較できます。メーカーや生産地の商品情報をもとにしたAI日本度と、判定根拠を掲載しています。",
    categorySlugs: ["kitchen"],
    minScore: 50,
    titleTermGroups: [["フライパン"]],
    excludeTitleTerms: ["コロッケ抜き", "揚げザル", "揚げ網"],
    selectionGuide: {
      title: "鉄フライパンのサイズと手入れ方法を確認する",
      description:
        "形とサイズ、手入れ方法、対応熱源や重さを順に確認すると、毎日の調理に合う候補を比べやすくなります。",
      points: [
        {
          title: "料理とサイズから選ぶ",
          description:
            "焼く量や食材に合わせ、直径と深さを確認します。卵焼き器など用途を絞った形もあるため、普段よく作る料理を基準に比べてください。",
        },
        {
          title: "使い始めと手入れ方法を見る",
          description:
            "油ならしが必要か、どう洗うか、さびを防ぐためにどう保管するかは商品によって異なります。使用前後の手入れ方法を販売ページで確認してください。",
        },
        {
          title: "熱源・重さ・持ち手を確認する",
          description:
            "IH・ガス火への対応、重さ、持ち手の素材や形を確認します。同じ直径でも重さは異なるため、扱いやすさを比べる目安になります。",
        },
      ],
    },
  },
  {
    slug: "imabari-towel-gifts",
    eyebrow: "IMABARI GIFTS",
    title: "今治タオルギフトを用途・セットで比較",
    shortTitle: "今治タオルのギフト",
    description:
      "フェイスタオル・バスタオルの組み合わせや枚数でギフトを比較。商品名に今治の表記がある通常購入の候補を、販売先レビューとAI日本度（推定）の根拠から探せます。送料・包装・のしの確認点も紹介します。",
    categorySlugs: ["towel", "gift"],
    minScore: 80,
    titleTermGroups: [["今治"], ["ギフト", "贈り", "セット"]],
    excludeTitleTerms: ["ふるさと納税", "枕", "ピロー", "訳あり"],
    selectionGuide: {
      title: "今治タオルギフトの枚数・包装・総額を比べる",
      description:
        "贈る用途、タオルの種類と枚数、送料・包装を含む総額を順に確認すると、候補を比べやすくなります。",
      points: [
        {
          title: "用途から必要な条件を決める",
          description:
            "内祝い、お礼、ご挨拶など、用途によって必要な包装やのしは異なります。自宅用なら、包装より枚数や乾きやすさを優先する選び方もあります。",
        },
        {
          title: "種類・枚数・サイズを見る",
          description:
            "フェイスタオル、バスタオル、両方を組み合わせたセットがあります。同じ名称でも寸法や枚数は異なるため、販売ページの仕様を確認してください。",
        },
        {
          title: "総額と包装条件を確認する",
          description:
            "商品価格と送料に加え、木箱などの包装、のし、メッセージカードに対応しているかも比べられます。現在の価格と条件は販売ページで確認してください。",
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
      "緑茶、ほうじ茶、玄米茶などの日本茶を紹介します。産地や原材料の商品情報をもとにしたAI日本度と、判定根拠を掲載しています。",
    categorySlugs: ["drinks", "food"],
    minScore: 80,
    titleTermGroups: [["緑茶", "日本茶", "ほうじ茶", "玄米茶"]],
    selectionGuide: {
      title: "日本茶の形状・原料原産地・内容量を確認する",
      description:
        "ティーバッグ、粉末、茶葉の形状に加え、お茶の名称、原料原産地、内容量を確認すると比べやすくなります。",
      points: [
        {
          title: "淹れ方から商品の形を選ぶ",
          description:
            "ティーバッグ、粉末、茶葉のどれかを、商品名や販売ページで確認します。淹れ方や必要な道具も販売ページで確かめてください。",
        },
        {
          title: "茶の名称と原料原産地を確認する",
          description:
            "粉末状でも、お茶の名称は一律ではありません。仕上げや包装をした場所と、原料となる茶葉の産地も同じとは限りません。名称と原料原産地は販売ページで確認してください。",
        },
        {
          title: "内容量と個数を比べる",
          description:
            "茶葉や粉末はグラム数、ティーバッグは1袋に入っている個数を確認します。セットの入り数も含め、必要な量に合うか比べてください。",
        },
      ],
      officialLinks: [
        {
          href: "https://www.maff.go.jp/j/heya/sodan/1404/01.html",
          label: "農林水産省「緑茶の種類」",
        },
        {
          href: "https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_260401_25.pdf",
          label: "消費者庁「緑茶の原料原産地表示」",
        },
      ],
    },
  },
  {
    slug: "regional-japanese-rice",
    eyebrow: "JAPANESE RICE",
    title: "産地表示から探すお米・無洗米",
    shortTitle: "お米・無洗米",
    description:
      "各地のお米や無洗米を比較できます。商品情報に記載された産地と、AI日本度の判定根拠を確認できます。",
    categorySlugs: ["food", "emergency"],
    minScore: 80,
    titleTermGroups: [["お米", "無洗米", "コシヒカリ", "ひとめぼれ", "はえぬき", "さがびより", "つや姫"]],
    excludeTitleTerms: [
      "味噌",
      "みそ",
      "ミソ",
      "醤油",
      "しょうゆ",
      "梅干し",
      "漬物",
      "佃煮",
      "加工品",
    ],
    selectionGuide: {
      title: "お米の年産・精米方法・内容量を比べる",
      description:
        "年産と産地、精米方法と内容量を確認すると、条件の違いを比べやすくなります。通常購入の商品とふるさと納税の返礼品は分けて確認します。",
      points: [
        {
          title: "年産・産地・品種を確認する",
          description:
            "商品名が似ていても、年産、都道府県、品種は異なります。単一原料米か複数原料米かも含め、現在の表示を販売ページで確認してください。",
        },
        {
          title: "精米方法と実容量を見る",
          description:
            "白米、無洗米、玄米の違いに加え、総重量と小分けの量を確認します。配送時期や保存場所も考え、消費できる量から選びます。",
        },
        {
          title: "購入価格と寄附額を分ける",
          description:
            "通常購入の商品価格と、ふるさと納税の寄附額は意味が異なります。返礼品は、寄附条件と発送時期を自治体の販売ページで確認してください。",
        },
      ],
    },
  },
  {
    slug: "domestic-pet-treats",
    eyebrow: "PET TREATS",
    title: "「国産」表示から探すペットのおやつ",
    shortTitle: "ペットのおやつ",
    description:
      "犬や猫のおやつ・フードを紹介します。「国産」などの表示や日本とのかかわりは、商品名とAI日本度の判定根拠で確認できます。",
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
      "工具、ペンチ、ニッパー、はさみなどを紹介します。メーカーや産地の商品情報をもとにしたAI日本度と、判定根拠を掲載しています。",
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
