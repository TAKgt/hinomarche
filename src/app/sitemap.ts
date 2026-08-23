import type { MetadataRoute } from "next";
import { getCategories, getSitemapProducts } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";
import { productSitemapEntries } from "@/lib/product-sitemap";
import { staticSitemapEntries } from "@/lib/static-sitemap";

export const revalidate = 3600;

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
