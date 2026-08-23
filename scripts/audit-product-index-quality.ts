/**
 * products全体の商品URL・index品質を管理権限で読み取り専用集計する。
 * 商品ID・商品名・URL・認証情報は出力せず、件数と理由別集計だけを表示する。
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const [
    {
      getProductEvidenceAuditRecords,
      getProductIndexAuditRecords,
      isDemoMode,
      productFreshnessMigrationAvailable,
      safeProductPageMigrationAvailable,
    },
    {
      PRODUCT_AI_JUDGMENT_MAX_AGE_DAYS,
      PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS,
    },
    { summarizeProductPopulation, summarizePublishedProductAudit },
    { publicEditorialEvidenceByProduct, summarizeProductEvidence },
  ] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/product-index-quality"),
    import("../src/lib/product-index-audit"),
    import("../src/lib/product-editorial-evidence"),
  ]);

  if (isDemoMode()) {
    throw new Error("Supabase未設定のため実データ監査は実行できません");
  }

  const evaluatedAt = new Date();
  const [
    products,
    evidenceRecords,
    migration019Applied,
    migration020Applied,
  ] = await Promise.all([
    getProductIndexAuditRecords(),
    getProductEvidenceAuditRecords(),
    productFreshnessMigrationAvailable(),
    safeProductPageMigrationAvailable(),
  ]);
  const editorialEvidenceByProductId = evidenceRecords
    ? publicEditorialEvidenceByProduct(evidenceRecords)
    : new Map();
  const summary = summarizeProductPopulation(products, evaluatedAt, {
    includeLowTier: process.env.SHOW_LOW_TIER !== "false",
    safePendingUrlsEnabled: migration020Applied,
    editorialEvidenceByProductId,
  });
  const publishedOnly = summarizePublishedProductAudit(
    products,
    evaluatedAt,
    editorialEvidenceByProductId,
  );
  const after020 = migration020Applied
    ? null
    : summarizeProductPopulation(products, evaluatedAt, {
        includeLowTier: process.env.SHOW_LOW_TIER !== "false",
        safePendingUrlsEnabled: true,
      });

  console.log(
    JSON.stringify(
      {
        scope: "all-products-read-only",
        evaluatedAt: evaluatedAt.toISOString(),
        indexGateUsedByMetadataAndSitemap: "technicalEligible",
        editorialEvidenceStorage:
          evidenceRecords === null ? "not-detected" : "detected",
        productEvidence:
          evidenceRecords === null
            ? null
            : summarizeProductEvidence(evidenceRecords),
        migrationStatus: {
          productJudgmentFreshness019: migration019Applied
            ? "detected"
            : "not-detected",
          safeProductPageUrls020: migration020Applied
            ? "detected"
            : "not-detected",
        },
        thresholds: {
          finalConfirmationMaxAgeDays:
            PRODUCT_FINAL_CONFIRMATION_MAX_AGE_DAYS,
          aiJudgmentMaxAgeDays: PRODUCT_AI_JUDGMENT_MAX_AGE_DAYS,
        },
        ...summary,
        publishedOnly,
        after020Projection: after020
          ? {
              publicUrl200: after020.publicUrl200,
              notFoundEquivalent: after020.notFoundEquivalent,
            }
          : null,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const safeError =
    error && typeof error === "object"
      ? {
          name: "name" in error ? String(error.name) : "AuditError",
          code: "code" in error ? String(error.code) : undefined,
          message: "監査処理に失敗しました",
        }
      : { name: "AuditError", message: "監査処理に失敗しました" };
  console.error(JSON.stringify(safeError));
  process.exit(1);
});
