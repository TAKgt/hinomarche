import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
