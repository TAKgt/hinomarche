export type RegionDefinition = {
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  titleTerms: string[];
  minScore: number;
};

export const REGIONS: RegionDefinition[] = [
  {
    slug: "tsubame-sanjo",
    name: "燕三条",
    eyebrow: "NIIGATA",
    title: "燕三条のキッチン用品・工具",
    description:
      "商品名に「燕三条」などの表記がある、調理器具やステンレス用品、工具を紹介します。",
    titleTerms: ["燕三条", "燕市", "三条市"],
    minScore: 80,
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
