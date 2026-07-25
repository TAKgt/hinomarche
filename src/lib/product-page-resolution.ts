import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  assessProductIndexQuality,
  buildProductMetadata,
} from "./product-index-quality";
import { displayProductTitle } from "./product-title";
import type { Product, ProductPageData } from "./types";

/** 品質未達は200+noindexを維持し、存在しない商品だけを従来どおり404にする。 */
export function requireProductPage<T extends Product | ProductPageData>(
  product: T | null,
): T {
  if (!product) notFound();
  return product;
}

export function productPageDataFromProduct(product: Product): ProductPageData {
  return {
    ...product,
    isPublished: product.isPublished ?? true,
    judgmentStatus:
      product.judgmentStatus ??
      (product.isPublished === false ? "pending" : "current"),
    judgmentInputHash: product.judgmentInputHash ?? null,
    judgmentInputHashAtJudgment:
      product.judgmentInputHashAtJudgment ?? null,
    consistencyStatus: product.consistencyStatus ?? "legacy",
    consistencyIssues: product.consistencyIssues ?? [],
  };
}

export function currentProductFromPage(
  product: ProductPageData,
): Product | null {
  const hashesMatch =
    product.judgmentInputHash === null &&
    product.judgmentInputHashAtJudgment === null
      ? true
      : product.judgmentInputHash !== null &&
        product.judgmentInputHash === product.judgmentInputHashAtJudgment;
  if (
    product.judgmentStatus !== "current" ||
    !hashesMatch ||
    product.score === null ||
    product.tier === null ||
    product.evidenceType === null ||
    !product.evidenceText ||
    product.consistencyStatus === "blocked"
  ) {
    return null;
  }
  return {
    ...product,
    score: product.score,
    tier: product.tier,
    evidenceType: product.evidenceType,
    evidenceText: product.evidenceText,
    consistencyStatus: product.consistencyStatus ?? "legacy",
  };
}

export type ProductAiState = "current" | "pending" | "blocked" | "stale";

export interface ProductPageResolution {
  urlVisible: true;
  aiState: ProductAiState;
  indexEligible: boolean;
  purchaseLinkEligible: boolean;
  currentProduct: Product | null;
}

/**
 * URL表示、AI判定、index、購入リンクを分離する。
 * pending/blocked/staleでは古い判定とCTAを出さず、安全側で200+noindexを維持する。
 */
export function resolveProductPage(
  product: ProductPageData,
  now = new Date(),
): ProductPageResolution {
  const candidate = currentProductFromPage(product);
  const quality = candidate
    ? assessProductIndexQuality(candidate, now)
    : null;
  const unsafeJudgment =
    quality?.reasons.includes("ai_judgment_missing") ||
    quality?.reasons.includes("ai_judgment_stale") ||
    quality?.reasons.includes("information_inconsistent");
  const currentProduct = unsafeJudgment ? null : candidate;
  const aiState: ProductAiState =
    product.judgmentStatus === "blocked"
      ? "blocked"
      : product.judgmentStatus === "pending"
        ? "pending"
        : quality?.reasons.includes("information_inconsistent")
          ? "blocked"
          : currentProduct
            ? "current"
            : "stale";

  return {
    urlVisible: true,
    aiState,
    indexEligible:
      currentProduct !== null && (quality?.technicalEligible ?? false),
    // 再判定中は商品同一性を保証できないため、リンクはcurrentかつtechnical通過時だけ表示する。
    purchaseLinkEligible:
      currentProduct !== null && (quality?.technicalEligible ?? false),
    currentProduct,
  };
}

export function buildProductPageMetadata(
  product: ProductPageData,
  now = new Date(),
): Metadata {
  const resolution = resolveProductPage(product, now);
  if (resolution.currentProduct) {
    return buildProductMetadata(resolution.currentProduct, now);
  }

  const title = displayProductTitle(product.title);
  const description =
    "販売元の商品情報とAI日本度の判定内容を再確認しています。確認完了後に判定根拠を再表示します。";
  const canonical = `/product/${product.id}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: product.imageUrl
        ? [{ url: product.imageUrl, alt: title }]
        : undefined,
    },
  };
}
