import type { MetadataRoute } from "next";
import { getCategories, getSitemapProducts } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";
import { productSitemapEntries } from "@/lib/product-sitemap";
import { staticSitemapEntries } from "@/lib/static-sitemap";

// 商品の掲載可否は「現在時刻から30日以内」など時間で変化する。
// 静的キャッシュに古いURL集合を残さず、商品詳細と同じ品質判定を
// sitemapへの各リクエストで評価する。
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteOrigin();
  const [categories, products] = await Promise.all([
    getCategories(),
    getSitemapProducts(),
  ]);

  return [
    ...staticSitemapEntries(baseUrl, categories),
    ...productSitemapEntries(products, baseUrl),
  ];
}
