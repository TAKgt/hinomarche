import type { MetadataRoute } from "next";
import { FEATURES } from "./features";
import { REGIONS } from "./regions";
import type { Category } from "./types";

/**
 * 実更新日時を保持していない静的・集約ページにはlastmodを推測して付けない。
 * Googleが使用しないpriority/changefreqも送らず、URL一覧だけを返す。
 */
export function staticSitemapEntries(
  baseUrl: string,
  categories: readonly Category[],
): MetadataRoute.Sitemap {
  return [
    { url: baseUrl },
    { url: `${baseUrl}/about` },
    { url: `${baseUrl}/disclaimer` },
    { url: `${baseUrl}/privacy` },
    { url: `${baseUrl}/contact` },
    { url: `${baseUrl}/popular` },
    { url: `${baseUrl}/recommended` },
    { url: `${baseUrl}/deals` },
    { url: `${baseUrl}/feature` },
    { url: `${baseUrl}/region` },
    ...FEATURES.map((feature) => ({
      url: `${baseUrl}/feature/${feature.slug}`,
    })),
    ...REGIONS.map((region) => ({
      url: `${baseUrl}/region/${region.slug}`,
    })),
    ...categories.map((category) => ({
      url: `${baseUrl}/category/${category.slug}`,
    })),
  ];
}
