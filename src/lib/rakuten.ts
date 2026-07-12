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
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";

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
      "itemCode,itemName,itemCaption,itemUrl,itemPrice,mediumImageUrls,shopName,reviewCount,reviewAverage,affiliateRate",
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
  const items = (json.Items ?? []).map((it: any) => it.Item ?? it);

  return items.map((item: any, index: number): RawProduct => {
    const imageUrl: string | null =
      item.mediumImageUrls?.[0]?.replace("?_ex=128x128", "?_ex=400x400") ?? null;
    return {
      source: "rakuten",
      sourceItemId: item.itemCode,
      title: item.itemName,
      description: item.itemCaption || null,
      maker: null, // 楽天APIにメーカー項目はないため説明文から判定に委ねる
      brand: null,
      imageUrl,
      price: item.itemPrice ?? null,
      affiliateUrl: wrapMoshimoRakuten(item.itemUrl),
      itemUrl: item.itemUrl,
      categorySlug,
      reviewCount: item.reviewCount ?? null,
      reviewAverage: item.reviewAverage ?? null,
      affiliateRate: item.affiliateRate ?? null,
      searchRank: index + 1,
    };
  });
}
