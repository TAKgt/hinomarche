function decodeMarkupValue(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const PRODUCT_MERCHANT_SUMMARY_MAX_LENGTH = 600;

export const PRIORITY_INTERNAL_LINK_REQUIREMENTS = [
  { from: "/", to: "/region/tsubame-sanjo" },
  { from: "/", to: "/feature/japanese-kitchen-knives" },
  { from: "/", to: "/region/imabari" },
  { from: "/", to: "/feature/imabari-towel-gifts" },
  { from: "/", to: "/feature/japanese-green-tea" },
  { from: "/", to: "/feature/rice-cookers" },
  {
    from: "/region/tsubame-sanjo",
    to: "/feature/japanese-kitchen-knives",
  },
  {
    from: "/feature/japanese-kitchen-knives",
    to: "/region/tsubame-sanjo",
  },
  { from: "/region/imabari", to: "/feature/imabari-towel-gifts" },
  { from: "/feature/imabari-towel-gifts", to: "/region/imabari" },
] as const;

export function summarizePriorityInternalLinks(
  internalPathsByPage: ReadonlyMap<string, readonly string[]>,
): { required: number; present: number; missing: number } {
  let present = 0;
  for (const requirement of PRIORITY_INTERNAL_LINK_REQUIREMENTS) {
    const linkedPaths = internalPathsByPage.get(requirement.from) ?? [];
    const found = linkedPaths.some((value) => {
      try {
        return new URL(value, "https://example.com").pathname === requirement.to;
      } catch {
        return false;
      }
    });
    if (found) present++;
  }
  return {
    required: PRIORITY_INTERNAL_LINK_REQUIREMENTS.length,
    present,
    missing: PRIORITY_INTERNAL_LINK_REQUIREMENTS.length - present,
  };
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"),
  );
  return match ? decodeMarkupValue(match[2]) : null;
}

function normalizedMarkupText(value: string): string {
  return decodeMarkupValue(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function collectJsonLdTypes(value: unknown, types: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdTypes(item, types);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (typeof type === "string") types.add(type);
  if (Array.isArray(type)) {
    for (const item of type) {
      if (typeof item === "string") types.add(item);
    }
  }
  for (const nested of Object.values(record)) collectJsonLdTypes(nested, types);
}

export function extractSitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeMarkupValue(match[1].trim()))
    .filter(Boolean);
}

export type RenderedSeoInspection = {
  title: string | null;
  description: string | null;
  h1Count: number;
  noindex: boolean;
  canonicalPath: string | null;
  internalPaths: string[];
  productTrackingQueryLinkCount: number;
  filterLinkWithoutNofollowCount: number;
  jsonLdTypes: string[];
  jsonLdParseErrors: number;
  productHeroImageCount: number;
  productHeroPlaceholderCount: number;
  productHeroPriorityInvalid: number;
  relatedProductImageCount: number;
  relatedProductImageLazyInvalid: number;
  productMerchantSummaryCount: number;
  productMerchantSummaryNosnippetInvalid: number;
  productMerchantSummaryTextOverLimit: number;
  hasNotFoundSearch: boolean;
  hasNotFoundRecoveryNavigation: boolean;
  notFoundRecoveryLinkCount: number;
};

export function inspectRenderedSeoHtml(
  html: string,
  pageUrl: string,
  internalOrigins: readonly string[],
): RenderedSeoInspection {
  const allowedOrigins = new Set(
    internalOrigins.map((value) => new URL(value).origin),
  );
  allowedOrigins.add(new URL(pageUrl).origin);

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? normalizedMarkupText(titleMatch[1]) || null : null;
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const descriptionTag = metaTags.find(
    (tag) => (attribute(tag, "name") ?? "").toLowerCase() === "description",
  );
  const descriptionValue = descriptionTag
    ? normalizedMarkupText(attribute(descriptionTag, "content") ?? "")
    : "";
  const description = descriptionValue || null;

  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  const canonicalTag = linkTags.find((tag) => {
    const rel = attribute(tag, "rel") ?? "";
    return rel.split(/\s+/).some((value) => value.toLowerCase() === "canonical");
  });
  const canonicalHref = canonicalTag ? attribute(canonicalTag, "href") : null;
  let canonicalPath: string | null = null;
  if (canonicalHref) {
    try {
      const url = new URL(canonicalHref, pageUrl);
      canonicalPath = `${url.pathname}${url.search}`;
    } catch {
      canonicalPath = null;
    }
  }

  const robotsContent = metaTags
    .filter((tag) => (attribute(tag, "name") ?? "").toLowerCase() === "robots")
    .map((tag) => attribute(tag, "content") ?? "")
    .join(",")
    .toLowerCase();

  const internalPaths = new Set<string>();
  const anchorTags = html.match(/<a\b[^>]*>/gi) ?? [];
  let productTrackingQueryLinkCount = 0;
  let filterLinkWithoutNofollowCount = 0;
  for (const tag of anchorTags) {
    const href = attribute(tag, "href");
    if (!href || href.startsWith("#")) continue;
    try {
      const url = new URL(href, pageUrl);
      if (!allowedOrigins.has(url.origin)) continue;
      internalPaths.add(`${url.pathname}${url.search}`);
      const relTokens = new Set(
        (attribute(tag, "rel") ?? "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean),
      );
      const hasTrackingQuery = ["surface", "context", "position"].some(
        (key) => url.searchParams.has(key),
      );
      if (url.pathname.startsWith("/product/") && hasTrackingQuery) {
        productTrackingQueryLinkCount += 1;
      }
      const hasFilterQuery = ["sort", "tier", "price", "reviews"].some(
        (key) => url.searchParams.has(key),
      );
      if (hasFilterQuery && !relTokens.has("nofollow")) {
        filterLinkWithoutNofollowCount += 1;
      }
    } catch {
      // 解決不能なhrefは別のリンク監査で扱い、ここでは内部導線に数えない。
    }
  }

  const jsonLdTypes = new Set<string>();
  let jsonLdParseErrors = 0;
  for (const match of html.matchAll(
    /(<script\b[^>]*>)([\s\S]*?)<\/script>/gi,
  )) {
    if ((attribute(match[1], "type") ?? "").toLowerCase() !== "application/ld+json") {
      continue;
    }
    try {
      collectJsonLdTypes(JSON.parse(match[2]), jsonLdTypes);
    } catch {
      jsonLdParseErrors += 1;
    }
  }

  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const productHeroImages = imageTags.filter(
    (tag) => attribute(tag, "data-product-hero") !== null,
  );
  const productHeroPriorityInvalid = productHeroImages.filter(
    (tag) =>
      (attribute(tag, "loading") ?? "").toLowerCase() !== "eager" ||
      (attribute(tag, "fetchpriority") ?? "").toLowerCase() !== "high" ||
      (attribute(tag, "decoding") ?? "").toLowerCase() !== "async",
  ).length;
  const relatedProductImages = imageTags.filter(
    (tag) => (attribute(tag, "data-product-surface") ?? "").toLowerCase() === "related",
  );
  const relatedProductImageLazyInvalid = relatedProductImages.filter(
    (tag) => (attribute(tag, "loading") ?? "").toLowerCase() !== "lazy",
  ).length;
  const openingTags = html.match(/<[a-z][^>]*>/gi) ?? [];
  const productHeroPlaceholderCount = openingTags.filter(
    (tag) => attribute(tag, "data-product-hero-placeholder") !== null,
  ).length;
  const productMerchantSummaryTags = openingTags.filter(
    (tag) => attribute(tag, "data-product-merchant-summary") !== null,
  );
  const productMerchantSummaryNosnippetInvalid =
    productMerchantSummaryTags.filter(
      (tag) => attribute(tag, "data-nosnippet") === null,
    ).length;
  const productMerchantSummaryTextOverLimit = [
    ...html.matchAll(
      /<p\b[^>]*\bdata-product-merchant-summary-text\s*=\s*(["']).*?\1[^>]*>([\s\S]*?)<\/p>/gi,
    ),
  ].filter(
    (match) =>
      normalizedMarkupText(match[2]).length >
      PRODUCT_MERCHANT_SUMMARY_MAX_LENGTH,
  ).length;
  const notFoundSearchSection = html.match(
    /<section\b[^>]*\bdata-not-found-search\s*=\s*(["']).*?\1[^>]*>([\s\S]*?)<\/section>/i,
  );
  const hasNotFoundSearchForm = (
    notFoundSearchSection?.[2].match(/<form\b[^>]*>/gi) ?? []
  ).some(
    (tag) => {
      if ((attribute(tag, "role") ?? "").toLowerCase() !== "search") return false;
      const action = attribute(tag, "action");
      if (!action) return false;
      try {
        return new URL(action, pageUrl).pathname === "/search";
      } catch {
        return false;
      }
    },
  );
  const notFoundRecoverySection = html.match(
    /<nav\b[^>]*\bdata-not-found-recovery\s*=\s*(["']).*?\1[^>]*>([\s\S]*?)<\/nav>/i,
  );
  const recoveryTargets = new Set([
    "/#categories",
    "/feature",
    "/popular",
    "/region",
    "/",
  ]);
  let notFoundRecoveryLinkCount = 0;
  for (const tag of notFoundRecoverySection?.[2].match(/<a\b[^>]*>/gi) ?? []) {
    const href = attribute(tag, "href");
    if (!href) continue;
    try {
      const url = new URL(href, pageUrl);
      if (!allowedOrigins.has(url.origin)) continue;
      if (recoveryTargets.has(`${url.pathname}${url.search}${url.hash}`)) {
        notFoundRecoveryLinkCount += 1;
      }
    } catch {
      // 404回復導線として解決できないhrefは件数に含めない。
    }
  }

  return {
    title,
    description,
    h1Count: (html.match(/<h1\b/gi) ?? []).length,
    noindex: robotsContent
      .split(/[\s,]+/)
      .some((value) => value === "noindex"),
    canonicalPath,
    internalPaths: [...internalPaths],
    productTrackingQueryLinkCount,
    filterLinkWithoutNofollowCount,
    jsonLdTypes: [...jsonLdTypes].sort(),
    jsonLdParseErrors,
    productHeroImageCount: productHeroImages.length,
    productHeroPlaceholderCount,
    productHeroPriorityInvalid,
    relatedProductImageCount: relatedProductImages.length,
    relatedProductImageLazyInvalid,
    productMerchantSummaryCount: productMerchantSummaryTags.length,
    productMerchantSummaryNosnippetInvalid,
    productMerchantSummaryTextOverLimit,
    hasNotFoundSearch: notFoundSearchSection != null && hasNotFoundSearchForm,
    hasNotFoundRecoveryNavigation: notFoundRecoverySection != null,
    notFoundRecoveryLinkCount,
  };
}

export function isCategoryPaginationPath(value: string): boolean {
  try {
    const url = new URL(value, "http://127.0.0.1");
    if (!url.pathname.startsWith("/category/")) return false;
    const keys = [...url.searchParams.keys()];
    if (keys.length !== 1 || keys[0] !== "page") return false;
    return /^[2-9]\d*$/.test(url.searchParams.get("page") ?? "");
  } catch {
    return false;
  }
}
