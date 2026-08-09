import type { RawProduct } from "./types";

/**
 * 楽天市場 商品検索API (IchibaItem/Search) クライアント。
 * 2026年のAPI刷新後の新仕様(openapi.rakuten.co.jp)に対応:
 * - applicationId(UUID) + accessKey の両方をクエリパラメータで渡す
 * - Refererヘッダー必須(アプリ登録時の「許可されたWebサイト」と一致させる)
 * 旧エンドポイント(app.rakuten.co.jp)は2026-05-14に停止済み。
 *
 * affiliateIdをAPIへ渡し、楽天アフィリエイト公式のaffiliateUrlを保存する。
 */

const ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

function validRakutenAffiliateId(value: string): boolean {
  return /^[A-Za-z0-9._-]{1,128}$/.test(value);
}

function isRakutenDestinationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname !== "hb.afl.rakuten.co.jp" &&
      (url.hostname === "rakuten.co.jp" ||
        url.hostname.endsWith(".rakuten.co.jp"))
    );
  } catch {
    return false;
  }
}

function originalRakutenItemUrl(itemUrl: unknown, affiliateUrl: string): string {
  if (
    typeof itemUrl === "string" &&
    itemUrl !== affiliateUrl &&
    isRakutenDestinationUrl(itemUrl)
  ) {
    return itemUrl;
  }

  const destination = new URL(affiliateUrl).searchParams.get("pc");
  if (!destination || !isRakutenDestinationUrl(destination)) {
    throw new Error("楽天APIのaffiliateUrlから元の商品URLを確認できません");
  }
  return destination;
}

/**
 * 楽天市場内の任意URLを、楽天ウェブサービス用アフィリエイトIDの直リンクにする。
 * 商品リンクは原則としてAPIが返したaffiliateUrlを使い、この関数は検索導線と
 * 既存DBの安全な移行にだけ使用する。
 */
export function buildRakutenAffiliateUrl(
  destinationUrl: string,
  affiliateId = process.env.RAKUTEN_AFFILIATE_ID,
): string {
  if (!affiliateId || !validRakutenAffiliateId(affiliateId)) {
    throw new Error("RAKUTEN_AFFILIATE_IDが未設定または不正です");
  }

  const destination = new URL(destinationUrl);
  if (!isRakutenDestinationUrl(destination.toString())) {
    throw new Error("楽天市場のHTTPS URLではありません");
  }

  const affiliateUrl = new URL(
    `https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(affiliateId)}/`,
  );
  affiliateUrl.searchParams.set("pc", destination.toString());
  affiliateUrl.searchParams.set("m", destination.toString());
  return affiliateUrl.toString();
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
  if (typeof item.affiliateUrl !== "string" || item.affiliateUrl.length === 0) {
    throw new Error("楽天APIがaffiliateUrlを返しませんでした");
  }
  const itemUrl = originalRakutenItemUrl(item.itemUrl, item.affiliateUrl);
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
    affiliateUrl: item.affiliateUrl,
    itemUrl,
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
  hits = 30,
): Promise<RawProduct[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  if (
    !appId ||
    !accessKey ||
    !affiliateId ||
    !validRakutenAffiliateId(affiliateId)
  ) {
    throw new Error(
      "RAKUTEN_APP_ID、RAKUTEN_ACCESS_KEY、RAKUTEN_AFFILIATE_IDが必要です",
    );
  }

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey,
    affiliateId,
    keyword,
    hits: String(Math.min(hits, 30)),
    sort: "standard",
    format: "json",
    formatVersion: "2",
    elements:
      "itemCode,itemName,itemCaption,itemUrl,affiliateUrl,itemPrice,mediumImageUrls,shopName,reviewCount,reviewAverage,affiliateRate,postageFlag,startTime,endTime,pointRate,pointRateStartTime,pointRateEndTime",
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
  const items = (json.Items ?? json.items ?? []).map(
    (it: any) => it.Item ?? it.item ?? it,
  );

  return items.map((item: any, index: number): RawProduct =>
    rakutenItemToRawProduct(item, categorySlug, index + 1),
  );
}
