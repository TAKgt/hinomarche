import type { Product } from "./types";

export type RegionDefinition = {
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  titleChunks?: string[];
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
    titleChunks: [
      "燕三条のキッチン用品",
      "｜包丁",
      "・水切りラック",
      "・調理器具",
    ],
    description:
      "商品名に「燕三条」「燕市」「三条市」と記載された包丁、水切りラック、調理小物を比較できます。価格・販売先レビュー・AI日本度の判定根拠を確認できます。",
    titleTerms: ["燕三条", "燕市", "三条市"],
    minScore: 80,
    selectionGuide: {
      title: "包丁・水切りラック・調理小物は何を比べれば良いか",
      description:
        "「燕三条」と記載された商品でも、確認する仕様は種類によって異なります。置き場所や普段の調理に合うかを見て、候補を絞ります。",
      points: [
        {
          title: "水切りは設置寸法を優先",
          description:
            "シンク横・シンク上など、置く場所を決めます。幅・奥行き・高さ、伸縮範囲、トレーの排水方向を販売ページで確認してください。",
        },
        {
          title: "包丁は用途と手入れで比較",
          description:
            "三徳や小型包丁などの種類と用途、刃渡り、重さ、素材を比べられます。対応する食材、食洗機への対応、研ぎ方も販売ページで確認してください。",
        },
        {
          title: "調理小物はサイズを確認",
          description:
            "ピーラー、バット、トングなどは、収納場所や一緒に使う器具に合うかを確認します。寸法、素材、手入れ方法を販売ページで確かめます。",
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
    title: "今治タオル｜普段使い・ギフト・ふるさと納税",
    description:
      "商品名に「今治」と記載されたタオルを用途別に比較できます。フェイスタオル、バスタオル、ギフトセット、ふるさと納税の返礼品が対象です。",
    titleTerms: ["今治"],
    minScore: 80,
    selectionGuide: {
      title: "今治タオルを自宅用・ギフト・返礼品で比べる",
      description:
        "自宅用、贈りもの、ふるさと納税では、確認する条件が異なります。用途を決めてから、サイズや枚数、価格を比べます。",
      points: [
        {
          title: "普段使いはサイズと枚数",
          description:
            "フェイスタオル、バスタオル、ミニバスタオルなどの種類と寸法、セット枚数を確認します。洗濯頻度や収納場所に合うものを選びます。",
        },
        {
          title: "ギフトは内容と包装",
          description:
            "贈る相手や場面に合わせ、タオルの組み合わせ、箱・包装の有無、のしへの対応を販売ページで確認してください。",
        },
        {
          title: "ふるさと納税は寄付条件",
          description:
            "寄付額に加え、返礼品の枚数・色、発送時期、申込条件を確認します。通常購入の商品とは分けて比べます。",
        },
      ],
      relatedLink: {
        href: "/feature/imabari-towel-gifts",
        label: "今治タオルのギフト特集を見る",
      },
    },
  },
  {
    slug: "hasami",
    name: "波佐見",
    eyebrow: "NAGASAKI",
    title: "波佐見焼の器",
    description:
      "皿や茶碗、マグカップなど、商品名に「波佐見」と記載された器を紹介します。",
    titleTerms: ["波佐見"],
    minScore: 80,
  },
  {
    slug: "mino",
    name: "美濃",
    eyebrow: "GIFU",
    title: "美濃焼・美濃和紙",
    description:
      "器や紙製品のうち、商品名に「美濃焼」「美濃和紙」と記載された品を紹介します。",
    titleTerms: ["美濃焼", "美濃和紙"],
    minScore: 80,
  },
  {
    slug: "nambu-tekki",
    name: "南部鉄器",
    eyebrow: "IWATE",
    title: "南部鉄器の鉄瓶・調理器具",
    description:
      "鉄瓶や急須、調理器具のうち、商品名に「南部鉄器」と記載された品を紹介します。",
    titleTerms: ["南部鉄器"],
    minScore: 80,
  },
  {
    slug: "senshu",
    name: "泉州",
    eyebrow: "OSAKA",
    title: "泉州タオル",
    description:
      "フェイスタオルやバスタオル、セット商品のうち、商品名に「泉州」と記載された品を紹介します。",
    titleTerms: ["泉州"],
    minScore: 80,
  },
  {
    slug: "edo-kiriko",
    name: "江戸切子",
    eyebrow: "TOKYO",
    title: "江戸切子のグラス・酒器",
    description:
      "グラスやタンブラー、酒器のうち、商品名に「江戸切子」と記載された品を紹介します。",
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
