const DAY_MS = 24 * 60 * 60 * 1000;
export const OFFICIAL_PRICE_COMPARISON_MAX_AGE_DAYS = 30;

interface OfficialPriceComparisonDefinition {
  productId: string;
  productInputHash: string;
  checkedAt: string;
  humanCheckedAt: string;
  set: OfficialPriceComparisonEntry;
  individualItems: readonly OfficialPriceComparisonEntry[];
}

export interface OfficialPriceComparisonEntry {
  code: string;
  label: string;
  price: number;
  sourceUrl: string;
}

export interface OfficialPriceComparison {
  productId: string;
  checkedAt: string;
  humanCheckedAt: string;
  expiresAt: string;
  set: OfficialPriceComparisonEntry;
  individualItems: readonly OfficialPriceComparisonEntry[];
  individualTotal: number;
  difference: number;
  differenceRatePercent: number;
}

const GST_B46_PRODUCT_ID = "7cbdf061-e26f-450a-a4b3-b3fd31ad7880";

const DEFINITIONS: Readonly<Record<string, OfficialPriceComparisonDefinition>> = {
  [GST_B46_PRODUCT_ID]: {
    productId: GST_B46_PRODUCT_ID,
    productInputHash:
      "fca154ac9b81529a3564f624f2d1fba21b7bca81fe9e5ed06df18a6ff7bcbf0f",
    checkedAt: "2026-08-11T00:47:36.632Z",
    humanCheckedAt: "2026-08-11T00:49:21.000Z",
    set: {
      code: "GST-B46",
      label: "三徳3点セット",
      price: 23_100,
      sourceUrl: "https://global.yoshikin.co.jp/SHOP/GST-B46.html",
    },
    individualItems: [
      {
        code: "G-46",
        label: "三徳 18cm",
        price: 12_100,
        sourceUrl: "https://global.yoshikin.co.jp/SHOP/G-46.html",
      },
      {
        code: "GS-3",
        label: "ペティーナイフ 13cm",
        price: 9_900,
        sourceUrl: "https://global.yoshikin.co.jp/SHOP/GS-3.html",
      },
      {
        code: "GSS-01",
        label: "GLOBALスピードシャープナー",
        price: 2_200,
        sourceUrl: "https://global.yoshikin.co.jp/SHOP/GSS-01.html",
      },
    ],
  },
};

export function getOfficialPriceComparison(
  productId: string,
  currentProductInputHash: string | null | undefined,
  now = new Date(),
): OfficialPriceComparison | null {
  const definition = DEFINITIONS[productId];
  if (
    !definition ||
    !currentProductInputHash ||
    currentProductInputHash !== definition.productInputHash
  ) {
    return null;
  }

  const checkedAtMs = Date.parse(definition.checkedAt);
  const nowMs = now.getTime();
  const expiresAtMs =
    checkedAtMs + OFFICIAL_PRICE_COMPARISON_MAX_AGE_DAYS * DAY_MS;
  const ageMs = nowMs - checkedAtMs;
  if (
    !Number.isFinite(checkedAtMs) ||
    !Number.isFinite(nowMs) ||
    ageMs < 0 ||
    nowMs > expiresAtMs
  ) {
    return null;
  }

  const individualTotal = definition.individualItems.reduce(
    (total, item) => total + item.price,
    0,
  );
  const difference = individualTotal - definition.set.price;
  const differenceRatePercent =
    individualTotal > 0
      ? Math.round((difference / individualTotal) * 1000) / 10
      : 0;

  return {
    productId: definition.productId,
    checkedAt: definition.checkedAt,
    humanCheckedAt: definition.humanCheckedAt,
    expiresAt: new Date(expiresAtMs).toISOString(),
    set: definition.set,
    individualItems: definition.individualItems,
    individualTotal,
    difference,
    differenceRatePercent,
  };
}
