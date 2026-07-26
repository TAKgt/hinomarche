import type { RawProduct } from "./types";

/**
 * 楽天市場 商品検索API (IchibaItem/Search) クライアント。
 * 2026年のAPI刷新後の新仕様(openapi.rakuten.co.jp)に対応:
 * - applicationId(UUID) + accessKey の両方をクエリパラメータで渡す
 * - Refererヘッダー必須(アプリ登録時の「許可されたWebサイト」と一致させる)
 * 旧エンドポイント(app.rakuten.co.jp)は2026-05-14に停止済み。
 *
 * アフィリエイトリンクは「もしもアフィリエイト」の楽天市場プロモーション形式で
 * 商品URLをラップして生成する(楽天アフィリエイト直は使わない)。
 */

const ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

/** もしもアフィリエイトの楽天市場用リンクにラップする */
export function wrapMoshimoRakuten(itemUrl: string): string {
  const aId = process.env.MOSHIMO_A_ID;
  if (!aId) return itemUrl;
  const pId = process.env.MOSHIMO_RAKUTEN_P_ID ?? "54";
  const pcId = process.env.MOSHIMO_RAKUTEN_PC_ID ?? "54";
  const plId = process.env.MOSHIMO_RAKUTEN_PL_ID ?? "616";
  return (
    `https://af.moshimo.com/af/c/click?a_id=${aId}` +
    `&p_id=${pId}&pc_id=${pcId}&pl_id=${plId}` +
    `&url=${encodeURIComponent(itemUrl)}`
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseRakutenDateTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00"] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function parsePointRate(value: unknown): number | null {
  const rate = Number(value);
  return Number.isInteger(rate) && rate >= 2 ? rate : null;
}

export function rakutenItemToRawProduct(
  item: any,
  categorySlug: string,
  searchRank: number,
): RawProduct {
  const imageUrl: string | null =
    item.mediumImageUrls?.[0]?.replace("?_ex=128x128", "?_ex=400x400") ?? null;
  return {
    source: "rakuten",
    sourceItemId: item.itemCode,
    title: item.itemName,
    description: item.itemCaption || null,
    maker: null,
    brand: null,
    imageUrl,
    price: item.itemPrice ?? null,
    affiliateUrl: wrapMoshimoRakuten(item.itemUrl),
    itemUrl: item.itemUrl,
    categorySlug,
    reviewCount: item.reviewCount ?? null,
    reviewAverage: item.reviewAverage ?? null,
    affiliateRate: item.affiliateRate ?? null,
    postageIncluded: Number(item.postageFlag) === 1,
    saleStartAt: parseRakutenDateTime(item.startTime),
    saleEndAt: parseRakutenDateTime(item.endTime),
    pointRate: parsePointRate(item.pointRate),
    pointRateStartAt: parseRakutenDateTime(item.pointRateStartTime),
    pointRateEndAt: parseRakutenDateTime(item.pointRateEndTime),
    searchRank,
  };
}

export async function searchRakuten(
  keyword: string,
  categorySlug: string,
  hits = 30
): Promise<RawProduct[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) {
    throw new Error(
      "RAKUTEN_APP_ID(アプリケーションID) と RAKUTEN_ACCESS_KEY(アクセスキー) の両方が必要です"
    );
  }

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey,
    keyword,
    hits: String(Math.min(hits, 30)),
    sort: "standard",
    format: "json",
    formatVersion: "2",
    elements:
      "itemCode,itemName,itemCaption,itemUrl,itemPrice,mediumImageUrls,shopName,reviewCount,reviewAverage,affiliateRate,postageFlag,startTime,endTime,pointRate,pointRateStartTime,pointRateEndTime",
  });

  // 楽天APIの「許可されたWebサイト」制限に対応: 登録ドメインをRefererとして名乗る。
  // Node.jsのfetchではRefererヘッダー直指定は無視されるため referrer オプションを使う
  const res = await fetch(`${ENDPOINT}?${params}`, {
    referrer: "https://hinomarche.com/",
    headers: { Origin: "https://hinomarche.com" },
  });
  if (!res.ok) {
    throw new Error(`楽天API エラー: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();

  // formatVersion=2なら商品オブジェクトの配列、非対応時は {Item: {...}} でラップされる
  const items = (json.Items ?? json.items ?? []).map((it: any) => it.Item ?? it.item ?? it);

  return items.map((item: any, index: number): RawProduct =>
    rakutenItemToRawProduct(item, categorySlug, index + 1),
  );
}
