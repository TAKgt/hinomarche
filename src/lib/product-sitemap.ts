import type { MetadataRoute } from "next";
import { assessProductIndexQuality } from "./product-index-quality";
import type { Product } from "./types";

export function productSitemapEntries(
  products: Product[],
  baseUrl: string,
  now = new Date(),
): MetadataRoute.Sitemap {
  return products
    .filter(
      (product) =>
        assessProductIndexQuality(product, now).technicalEligible,
    )
    .map((product) => {
      const lastConfirmedAt = product.fetchedAt ?? product.priceUpdatedAt;
      return {
        url: `${baseUrl}/product/${product.id}`,
        lastModified: lastConfirmedAt
          ? new Date(lastConfirmedAt)
          : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    });
}
