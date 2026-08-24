/**
 * 起動済みローカルサイトをsitemapから巡回し、status・metadata・リンク・
 * 構造化データ・画像・404を件数だけで検査する。商品ID・URL・商品名は出力しない。
 */
import {
  extractSitemapLocations,
  inspectRenderedSeoHtml,
  isCategoryPaginationPath,
  summarizePriorityInternalLinks,
  type RenderedSeoInspection,
} from "../src/lib/local-seo-audit";

type PageResult = {
  path: string;
  status: number;
  inspection: RenderedSeoInspection | null;
};

function baseUrlFromArgs(): URL {
  const prefix = "--base-url=";
  const value = process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
  if (!value) throw new Error("--base-urlが必要です");

  const url = new URL(value);
  const allowedHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (url.protocol !== "http:" || !allowedHosts.has(url.hostname)) {
    throw new Error("ローカルHTTP URLだけを指定できます");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function canonicalTargetPath(value: string): string {
  const url = new URL(value, "https://example.com");
  return `${url.pathname}${url.search}`;
}

function pageKind(path: string): string {
  const pathname = new URL(path, "https://example.com").pathname;
  if (pathname === "/") return "home";
  if (pathname.startsWith("/product/")) return "product";
  if (pathname.startsWith("/category/")) return "category";
  if (pathname === "/feature") return "feature-index";
  if (pathname.startsWith("/feature/")) return "feature-detail";
  if (pathname === "/region") return "region-index";
  if (pathname.startsWith("/region/")) return "region-detail";
  if (["/popular", "/recommended", "/deals"].includes(pathname)) {
    return "product-listing";
  }
  if (["/about", "/contact", "/disclaimer", "/privacy"].includes(pathname)) {
    return "information";
  }
  return "other";
}

function countByPageKind(paths: readonly string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const path of paths) {
    const kind = pageKind(path);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

function duplicateSummary(
  results: readonly PageResult[],
  select: (inspection: RenderedSeoInspection) => string | null,
): { groups: number; pages: number } {
  const counts = new Map<string, number>();
  for (const result of results) {
    if (
      result.status !== 200 ||
      !result.inspection ||
      result.inspection.noindex ||
      isCategoryPaginationPath(result.path)
    ) {
      continue;
    }
    const value = select(result.inspection);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const duplicates = [...counts.values()].filter((count) => count > 1);
  return {
    groups: duplicates.length,
    pages: duplicates.reduce((total, count) => total + count, 0),
  };
}

async function main() {
  const baseUrl = baseUrlFromArgs();
  const sitemapResponse = await fetch(new URL("/sitemap.xml", baseUrl));
  if (!sitemapResponse.ok) {
    throw new Error("ローカルsitemapを取得できません");
  }

  const sitemapLocations = extractSitemapLocations(
    await sitemapResponse.text(),
  );
  if (sitemapLocations.length === 0) {
    throw new Error("ローカルsitemapが空です");
  }

  const publicOrigin = new URL(sitemapLocations[0]).origin;
  const sitemapPaths = sitemapLocations.map(canonicalTargetPath);
  const sitemapPathSet = new Set(sitemapPaths);
  const queue = [...sitemapPaths];
  const queued = new Set(queue);
  const results: PageResult[] = [];

  let cursor = 0;
  while (cursor < queue.length) {
    if (queue.length > 1000) throw new Error("巡回上限を超えました");
    const paths = queue.slice(cursor, cursor + 8);
    cursor += paths.length;
    const batch = await Promise.all(
      paths.map(async (path): Promise<PageResult> => {
        try {
          const response = await fetch(new URL(path, baseUrl), {
            redirect: "manual",
          });
          const contentType = response.headers.get("content-type") ?? "";
          const inspection = contentType.includes("text/html")
            ? inspectRenderedSeoHtml(await response.text(), response.url, [
                publicOrigin,
              ])
            : null;
          return { path, status: response.status, inspection };
        } catch {
          return { path, status: 0, inspection: null };
        }
      }),
    );
    results.push(...batch);

    for (const result of batch) {
      for (const path of result.inspection?.internalPaths ?? []) {
        if (!isCategoryPaginationPath(path)) continue;
        if (queued.has(path)) continue;
        queued.add(path);
        queue.push(path);
      }
    }
  }

  let notFoundResult: PageResult;
  try {
    const response = await fetch(
      new URL("/__local-seo-audit-missing__", baseUrl),
      { redirect: "manual" },
    );
    const contentType = response.headers.get("content-type") ?? "";
    const inspection = contentType.includes("text/html")
      ? inspectRenderedSeoHtml(await response.text(), response.url, [
          publicOrigin,
        ])
      : null;
    notFoundResult = {
      path: "/__local-seo-audit-missing__",
      status: response.status,
      inspection,
    };
  } catch {
    notFoundResult = {
      path: "/__local-seo-audit-missing__",
      status: 0,
      inspection: null,
    };
  }

  const resultByPath = new Map(results.map((result) => [result.path, result]));
  const incoming = new Map(sitemapPaths.map((path) => [path, 0]));
  for (const result of results) {
    for (const linkedPath of result.inspection?.internalPaths ?? []) {
      const target = new URL(linkedPath, baseUrl).pathname;
      if (!sitemapPathSet.has(target)) continue;
      incoming.set(target, (incoming.get(target) ?? 0) + 1);
    }
  }

  const targetResults = sitemapPaths.map((path) => resultByPath.get(path));
  const non200 = targetResults.filter((result) => result?.status !== 200).length;
  const missingHtml = targetResults.filter((result) => !result?.inspection).length;
  const h1Invalid = targetResults.filter(
    (result) => result?.inspection && result.inspection.h1Count !== 1,
  ).length;
  const canonicalMissingPaths = sitemapPaths.filter((path) => {
    const inspection = resultByPath.get(path)?.inspection;
    return inspection != null && !inspection.canonicalPath;
  });
  const canonicalMissing = canonicalMissingPaths.length;
  const canonicalMismatch = sitemapPaths.filter((path) => {
    const canonical = resultByPath.get(path)?.inspection?.canonicalPath;
    return canonical != null && canonical !== path;
  }).length;
  const noindex = targetResults.filter(
    (result) => result?.inspection?.noindex === true,
  ).length;
  const titleMissingPaths = sitemapPaths.filter((path) => {
    const inspection = resultByPath.get(path)?.inspection;
    return inspection != null && !inspection.noindex && !inspection.title;
  });
  const descriptionMissingPaths = sitemapPaths.filter((path) => {
    const inspection = resultByPath.get(path)?.inspection;
    return inspection != null && !inspection.noindex && !inspection.description;
  });
  const titleDuplicates = duplicateSummary(
    results,
    (inspection) => inspection.title,
  );
  const descriptionDuplicates = duplicateSummary(
    results,
    (inspection) => inspection.description,
  );
  const orphanedPaths = sitemapPaths.filter(
    (path) => path !== "/" && (incoming.get(path) ?? 0) === 0,
  );
  const orphaned = orphanedPaths.length;
  const priorityInternalLinks = summarizePriorityInternalLinks(
    new Map(
      results.flatMap((result) =>
        result.inspection
          ? [[result.path, result.inspection.internalPaths] as const]
          : [],
      ),
    ),
  );
  const productTrackingQueryLinks = results.reduce(
    (total, result) =>
      total + (result.inspection?.productTrackingQueryLinkCount ?? 0),
    0,
  );
  const filterLinksWithoutNofollow = results.reduce(
    (total, result) =>
      total + (result.inspection?.filterLinkWithoutNofollowCount ?? 0),
    0,
  );
  const jsonLdParseErrors = results.reduce(
    (total, result) => total + (result.inspection?.jsonLdParseErrors ?? 0),
    0,
  );
  const productResults = sitemapPaths
    .filter((path) => pageKind(path) === "product")
    .map((path) => resultByPath.get(path))
    .filter(
      (result): result is PageResult & { inspection: RenderedSeoInspection } =>
        result?.inspection != null,
    );
  const productSchemaMissing = productResults.filter(
    (result) => !result.inspection.jsonLdTypes.includes("Product"),
  ).length;
  const breadcrumbSchemaMissing = productResults.filter(
    (result) => !result.inspection.jsonLdTypes.includes("BreadcrumbList"),
  ).length;
  const productHeroMissing = productResults.filter(
    (result) =>
      result.inspection.productHeroImageCount === 0 &&
      result.inspection.productHeroPlaceholderCount === 0,
  ).length;
  const productHeroMultiple = productResults.filter(
    (result) => result.inspection.productHeroImageCount > 1,
  ).length;
  const productHeroPriorityInvalid = productResults.reduce(
    (total, result) =>
      total + result.inspection.productHeroPriorityInvalid,
    0,
  );
  const relatedProductImages = productResults.reduce(
    (total, result) => total + result.inspection.relatedProductImageCount,
    0,
  );
  const relatedProductImageLazyInvalid = productResults.reduce(
    (total, result) =>
      total + result.inspection.relatedProductImageLazyInvalid,
    0,
  );
  const productMerchantSummaries = productResults.reduce(
    (total, result) =>
      total + result.inspection.productMerchantSummaryCount,
    0,
  );
  const productMerchantSummaryNosnippetInvalid = productResults.reduce(
    (total, result) =>
      total + result.inspection.productMerchantSummaryNosnippetInvalid,
    0,
  );
  const productMerchantSummaryTextOverLimit = productResults.reduce(
    (total, result) =>
      total + result.inspection.productMerchantSummaryTextOverLimit,
    0,
  );
  const notFoundInspection = notFoundResult.inspection;
  const notFoundChecks = {
    status404: notFoundResult.status === 404,
    h1Valid: notFoundInspection?.h1Count === 1,
    noindex: notFoundInspection?.noindex === true,
    search: notFoundInspection?.hasNotFoundSearch === true,
    recoveryNavigation:
      notFoundInspection?.hasNotFoundRecoveryNavigation === true,
    recoveryLinks: notFoundInspection?.notFoundRecoveryLinkCount ?? 0,
  };
  const notFoundValid =
    notFoundChecks.status404 &&
    notFoundChecks.h1Valid &&
    notFoundChecks.noindex &&
    notFoundChecks.search &&
    notFoundChecks.recoveryNavigation &&
    notFoundChecks.recoveryLinks >= 5;

  const summary = {
    scope: "local-sitemap-seo-read-only",
    execution: {
      localHttpRequests: results.length + 2,
      externalHttpRequests: 0,
      externalStateChanges: 0,
      databaseWrites: 0,
      externalSends: 0,
    },
    pages: {
      sitemap: sitemapPaths.length,
      paginationFollowed: queue.length - sitemapPaths.length,
      fetched: results.length,
    },
    status: { non200, missingHtml },
    metadata: {
      h1Invalid,
      canonicalMissing,
      canonicalMissingByPageKind: countByPageKind(canonicalMissingPaths),
      canonicalMismatch,
      noindex,
      titleMissing: titleMissingPaths.length,
      titleMissingByPageKind: countByPageKind(titleMissingPaths),
      descriptionMissing: descriptionMissingPaths.length,
      descriptionMissingByPageKind: countByPageKind(descriptionMissingPaths),
      duplicateWarnings: {
        titleGroups: titleDuplicates.groups,
        titlePages: titleDuplicates.pages,
        descriptionGroups: descriptionDuplicates.groups,
        descriptionPages: descriptionDuplicates.pages,
        paginationExcluded: true,
      },
    },
    links: {
      withIncoming: sitemapPaths.length - orphaned - 1,
      orphaned,
      orphanedByPageKind: countByPageKind(orphanedPaths),
      homepageExempt: 1,
      priorityThemes: priorityInternalLinks,
      productTrackingQueryLinks,
      filterLinksWithoutNofollow,
    },
    structuredData: {
      productPagesInspected: productResults.length,
      productSchemaMissing,
      breadcrumbSchemaMissing,
      jsonLdParseErrors,
    },
    images: {
      productHeroMissing,
      productHeroMultiple,
      productHeroPriorityInvalid,
      relatedProductImages,
      relatedProductImageLazyInvalid,
    },
    productContent: {
      merchantSummaries: productMerchantSummaries,
      merchantSummaryNosnippetInvalid:
        productMerchantSummaryNosnippetInvalid,
      merchantSummaryTextOverLimit: productMerchantSummaryTextOverLimit,
    },
    notFound: {
      ...notFoundChecks,
      valid: notFoundValid,
    },
  };
  console.log(JSON.stringify(summary, null, 2));

  if (
    non200 > 0 ||
    missingHtml > 0 ||
    h1Invalid > 0 ||
    canonicalMissing > 0 ||
    canonicalMismatch > 0 ||
    noindex > 0 ||
    titleMissingPaths.length > 0 ||
    descriptionMissingPaths.length > 0 ||
    orphaned > 0 ||
    priorityInternalLinks.missing > 0 ||
    productTrackingQueryLinks > 0 ||
    filterLinksWithoutNofollow > 0 ||
    jsonLdParseErrors > 0 ||
    productSchemaMissing > 0 ||
    breadcrumbSchemaMissing > 0 ||
    productHeroMissing > 0 ||
    productHeroMultiple > 0 ||
    productHeroPriorityInvalid > 0 ||
    relatedProductImageLazyInvalid > 0 ||
    productMerchantSummaryNosnippetInvalid > 0 ||
    productMerchantSummaryTextOverLimit > 0 ||
    !notFoundValid
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const safeError =
    error && typeof error === "object"
      ? {
          name: "name" in error ? String(error.name) : "AuditError",
          message: "ローカルSEO巡回に失敗しました",
        }
      : { name: "AuditError", message: "ローカルSEO巡回に失敗しました" };
  console.error(JSON.stringify(safeError));
  process.exit(1);
});
