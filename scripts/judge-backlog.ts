/**
 * 収集済みの判定待ち商品だけをAI判定して公開するローカル運用コマンド。
 * 商品APIの再検索を行わないため、バックログを追加消化したい場合に使う。
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const [
    { getCategories, getCategoryInventory, getUnjudgedProducts, saveJudgment },
    { judgeProduct },
    { planUnderfilledCategories },
  ] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/judge"),
    import("../src/lib/ingest-plan"),
  ]);

  const configuredLimit = Number(process.env.INGEST_MAX_NEW ?? 30);
  const limit =
    Number.isFinite(configuredLimit) && configuredLimit > 0
      ? Math.floor(configuredLimit)
      : 30;
  const requestedSlugs = (process.env.INGEST_CATEGORY_SLUGS ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const createdAfterInput = process.env.INGEST_CREATED_AFTER?.trim();
  if (createdAfterInput && Number.isNaN(Date.parse(createdAfterInput))) {
    throw new Error("INGEST_CREATED_AFTERはISO 8601形式で指定してください");
  }
  const createdAfter = createdAfterInput
    ? new Date(createdAfterInput).toISOString()
    : undefined;
  const configuredTarget = Number(process.env.INGEST_MIN_CATEGORY_PRODUCTS ?? 12);
  const target =
    Number.isFinite(configuredTarget) && configuredTarget > 0
      ? Math.floor(configuredTarget)
      : 12;
  const [categories, inventory] = await Promise.all([
    getCategories(),
    getCategoryInventory(),
  ]);
  const matchedCategories = requestedSlugs.length > 0
    ? categories.filter((category) => requestedSlugs.includes(category.slug))
    : categories;
  if (requestedSlugs.length > 0 && matchedCategories.length === 0) {
    throw new Error("INGEST_CATEGORY_SLUGSに一致する有効カテゴリがありません");
  }

  const plan = requestedSlugs.length > 0
    ? null
    : planUnderfilledCategories(
        matchedCategories,
        inventory,
        matchedCategories.length,
        target,
      );
  const categorySlugs = plan
    ? plan.categories.map((category) => category.slug)
    : matchedCategories.map((category) => category.slug);
  const products = await getUnjudgedProducts(
    limit,
    categorySlugs,
    plan?.judgmentLimits,
    createdAfter,
  );
  const errors: string[] = [];
  let published = 0;

  console.log(
    `判定待ちから最大${limit}件を処理します… 対象: ${categorySlugs.join(", ")}${createdAfter ? ` / ${createdAfter}以降` : ""}`,
  );
  for (const { id, raw } of products) {
    try {
      const judgment = await judgeProduct(raw);
      await saveJudgment(id, judgment);
      published++;
    } catch (error) {
      errors.push(`${raw.title.slice(0, 30)}: ${String(error)}`);
    }
  }

  console.log(`AI判定・公開: ${published}件`);
  if (errors.length > 0) {
    console.log(`エラー: ${errors.length}件`);
    for (const error of errors) console.log(`  - ${error}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
