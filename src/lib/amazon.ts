import type { RawProduct } from "./types";

/**
 * Amazon Creators API クライアント(旧PA-APIの後継)。
 * PA-API v5は2026-05-15に廃止され、Creators APIに完全移行した。
 * - 認証: OAuth2 client_credentials(LWA)。日本は https://api.amazon.co.jp/auth/o2/token
 * - API: https://creatorsapi.amazon/catalog/v1/searchItems
 * - リージョンは x-marketplace ヘッダーで指定(www.amazon.co.jp)
 * - Authorizationヘッダーは `Bearer <token>, Version <認証情報バージョン>` 形式
 * 認証情報(credential ID/secret)はアソシエイト管理画面 → ツール → Creators API で発行する。
 */

const API_HOST = "https://creatorsapi.amazon";
const MARKETPLACE = "www.amazon.co.jp";
// 日本のLWA認証情報はバージョン3.3(トークンURLが api.amazon.co.jp になる)
const CREDS_VERSION = process.env.AMAZON_CREDS_VERSION ?? "3.3";
const TOKEN_URL =
  CREDS_VERSION === "3.1"
    ? "https://api.amazon.com/auth/o2/token"
    : CREDS_VERSION === "3.2"
      ? "https://api.amazon.co.uk/auth/o2/token"
      : "https://api.amazon.co.jp/auth/o2/token";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.AMAZON_CREDENTIAL_ID,
      client_secret: process.env.AMAZON_CREDENTIAL_SECRET,
      scope: "creatorsapi::default",
    }),
  });
  if (!res.ok) {
    throw new Error(`Creators API トークン取得エラー: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function searchAmazon(
  keyword: string,
  categorySlug: string,
  itemCount = 10
): Promise<RawProduct[]> {
  const credentialId = process.env.AMAZON_CREDENTIAL_ID;
  const credentialSecret = process.env.AMAZON_CREDENTIAL_SECRET;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;
  if (!credentialId || !credentialSecret || !partnerTag) {
    throw new Error(
      "AMAZON_CREDENTIAL_ID / AMAZON_CREDENTIAL_SECRET / AMAZON_PARTNER_TAG が設定されていません"
    );
  }

  const token = await getAccessToken();
  const res = await fetch(`${API_HOST}/catalog/v1/searchItems`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}, Version ${CREDS_VERSION}`,
      "x-marketplace": MARKETPLACE,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keywords: keyword,
      partnerTag,
      itemCount: Math.min(itemCount, 10),
      resources: [
        "itemInfo.title",
        "itemInfo.features",
        "itemInfo.byLineInfo",
        "itemInfo.manufactureInfo",
        "images.primary.large",
        "offersV2.listings.price",
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Creators API エラー: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();

  return (json.searchResult?.items ?? []).map((item: any): RawProduct => {
    const features: string[] = item.itemInfo?.features?.displayValues ?? [];
    const amount = item.offersV2?.listings?.[0]?.price?.money?.amount;
    return {
      source: "amazon",
      sourceItemId: item.asin,
      title: item.itemInfo?.title?.displayValue ?? "",
      description: features.length > 0 ? features.join("\n") : null,
      maker: item.itemInfo?.byLineInfo?.manufacturer?.displayValue ?? null,
      brand: item.itemInfo?.byLineInfo?.brand?.displayValue ?? null,
      imageUrl: item.images?.primary?.large?.url ?? null,
      price: amount != null ? Math.round(amount) : null,
      affiliateUrl: item.detailPageURL, // partnerTag付きで返る
      itemUrl: item.detailPageURL,
      categorySlug,
    };
  });
}
