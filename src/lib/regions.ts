import type { Product } from "./types";

export type RegionDefinition = {
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  titleTerms: string[];
  minScore: number;
  selectionGuide?: {
    title: string;
    description: string;
    points: {
      title: string;
      description: string;
    }[];
    relatedLink?: {
      href: string;
      label: string;
    };
  };
};

export const REGIONS: RegionDefinition[] = [
  {
    slug: "tsubame-sanjo",
    name: "燕三条",
    eyebrow: "NIIGATA",
    title: "燕三条のキッチン用品｜包丁・水切りラック・調理器具",
    description:
      "商品名に「燕三条」「燕市」「三条市」の表記がある包丁、水切りラック、調理小物を、AI日本度の根拠と販売先レビュー、価格から比較できます。",
    titleTerms: ["燕三条", "燕市", "三条市"],
    minScore: 80,
    selectionGuide: {
      title: "燕三条のキッチン用品を比べる3つの視点",
      description:
        "産地名だけでなく、置き場所や普段の調理に合う仕様まで確認すると候補を絞りやすくなります。",
      points: [
        {
          title: "水切りは設置寸法を優先",
          description:
            "シンク横・シンク上など置き方を決め、幅と奥行き、伸縮範囲、トレーの排水方向を販売ページで確認してください。",
        },
        {
          title: "包丁は用途と手入れで比較",
          description:
            "三徳や小型包丁などの用途に加え、刃渡り、重さ、食洗機への対応可否、研ぎ方の説明も比較材料になります。",
        },
        {
          title: "調理小物はサイズを確認",
          description:
            "ピーラー、バット、トングなどは収納場所や一緒に使う器具との相性があるため、寸法と素材を確認して選びます。",
        },
      ],
      relatedLink: {
        href: "/feature/japanese-kitchen-knives",
        label: "日本とのかかわりで選ぶ包丁特集を見る",
      },
    },
  },
  {
    slug: "imabari",
    name: "今治",
    eyebrow: "EHIME",
    title: "今治タオル",
    description:
      "商品名に「今治」の表記がある、フェイスタオルやバスタオル、ギフトセットを紹介します。",
    titleTerms: ["今治"],
    minScore: 80,
  },
  {
    slug: "hasami",
    name: "波佐見",
    eyebrow: "NAGASAKI",
    title: "波佐見焼の器",
    description:
      "商品名に「波佐見」の表記がある、皿や茶碗、マグカップなどの器を紹介します。",
    titleTerms: ["波佐見"],
    minScore: 80,
  },
  {
    slug: "mino",
    name: "美濃",
    eyebrow: "GIFU",
    title: "美濃焼・美濃和紙",
    description:
      "商品名に「美濃焼」または「美濃和紙」の表記がある、器や紙製品を紹介します。",
    titleTerms: ["美濃焼", "美濃和紙"],
    minScore: 80,
  },
  {
    slug: "nambu-tekki",
    name: "南部鉄器",
    eyebrow: "IWATE",
    title: "南部鉄器の鉄瓶・調理器具",
    description:
      "商品名に「南部鉄器」の表記がある、鉄瓶や急須、調理器具を紹介します。",
    titleTerms: ["南部鉄器"],
    minScore: 80,
  },
  {
    slug: "senshu",
    name: "泉州",
    eyebrow: "OSAKA",
    title: "泉州タオル",
    description:
      "商品名に「泉州」の表記がある、フェイスタオルやバスタオル、セット商品を紹介します。",
    titleTerms: ["泉州"],
    minScore: 80,
  },
  {
    slug: "edo-kiriko",
    name: "江戸切子",
    eyebrow: "TOKYO",
    title: "江戸切子のグラス・酒器",
    description:
      "商品名に「江戸切子」の表記がある、グラスやタンブラー、酒器を紹介します。",
    titleTerms: ["江戸切子"],
    minScore: 80,
  },
];

export function getRegion(slug: string): RegionDefinition | undefined {
  return REGIONS.find((region) => region.slug === slug);
}

export function matchesRegionProduct(region: RegionDefinition, product: Product): boolean {
  return (
    product.score >= region.minScore &&
    region.titleTerms.some((term) => product.title.includes(term))
  );
}

export function getRegionsForProduct(product: Product, limit = 3): RegionDefinition[] {
  return REGIONS.filter((region) => matchesRegionProduct(region, product)).slice(0, limit);
}
