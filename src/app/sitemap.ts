import type { MetadataRoute } from "next";
import { getCategories, getPublishedProducts } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteOrigin();
  const [categories, products] = await Promise.all([
    getCategories(),
    getPublishedProducts({ limit: 1000 }),
  ]);

  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/disclaimer`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/contact`, changeFrequency: "yearly", priority: 0.2 },
    ...categories.map((c) => ({
      url: `${baseUrl}/category/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${baseUrl}/product/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
