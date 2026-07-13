import type { MetadataRoute } from "next";
import { getCategories, getSitemapProducts } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";
import { FEATURES } from "@/lib/features";
import { REGIONS } from "@/lib/regions";

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
    ...products.map((p) => ({
      url: `${baseUrl}/product/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
