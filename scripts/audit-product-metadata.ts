/**
 * 公開可能な商品の検索表示用metadataを読み取り専用で集計する。
 * 商品ID・商品名・URL・認証情報は出力しない。
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const [
    { getSitemapProducts, isDemoMode },
    { assessProductIndexQuality },
    { summarizeProductMetadataQuality },
  ] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/product-index-quality"),
    import("../src/lib/product-metadata"),
  ]);

  if (isDemoMode()) {
    throw new Error("実データ監査に必要な設定を確認できません");
  }

  const evaluatedAt = new Date();
  const products = await getSitemapProducts();
  const technicalEligible = products.filter(
    (product) =>
      assessProductIndexQuality(product, evaluatedAt).technicalEligible,
  );

  console.log(
    JSON.stringify(
      {
        scope: "product-metadata-read-only",
        evaluatedAt: evaluatedAt.toISOString(),
        execution: { databaseWrites: 0, externalProductApiCalls: 0 },
        ...summarizeProductMetadataQuality(technicalEligible),
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
          message: "商品metadata監査に失敗しました",
        }
      : { name: "AuditError", message: "商品metadata監査に失敗しました" };
  console.error(JSON.stringify(safeError));
  process.exit(1);
});
