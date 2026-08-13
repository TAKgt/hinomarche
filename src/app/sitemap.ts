import type { MetadataRoute } from "next";
import { getCategories, getSitemapProducts } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";
import { FEATURES } from "@/lib/features";
import { REGIONS } from "@/lib/regions";
import { productSitemapEntries } from "@/lib/product-sitemap";

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
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/disclaimer`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/contact`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/popular`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/recommended`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/deals`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/feature`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/region`, changeFrequency: "weekly", priority: 0.8 },
    ...FEATURES.map((feature) => ({
      url: `${baseUrl}/feature/${feature.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...REGIONS.map((region) => ({
      url: `${baseUrl}/region/${region.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...categories.map((c) => ({
      url: `${baseUrl}/category/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...productSitemapEntries(products, baseUrl),
  ];
}
