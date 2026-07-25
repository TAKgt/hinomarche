const RAKUTEN_THUMBNAIL_HOST = "thumbnail.image.rakuten.co.jp";

/**
 * 一覧カードでは320pxを上限にし、外部モール画像の転送量を抑える。
 * 商品詳細と構造化データは保存済みの元URLをそのまま使う。
 */
export function productCardImageUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== RAKUTEN_THUMBNAIL_HOST) return imageUrl;

    url.searchParams.set("_ex", "320x320");
    return url.toString();
  } catch {
    return imageUrl;
  }
}

/** 大きな特集枠では、商品画像を十分な解像度で表示する。 */
export function productFeatureImageUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== RAKUTEN_THUMBNAIL_HOST) return imageUrl;

    url.searchParams.set("_ex", "800x800");
    return url.toString();
  } catch {
    return imageUrl;
  }
}
