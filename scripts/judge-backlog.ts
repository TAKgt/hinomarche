/**
 * 収集済みの判定待ち商品だけをAI判定して公開するローカル運用コマンド。
 * 商品APIの再検索を行わないため、バックログを追加消化したい場合に使う。
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const [{ getUnjudgedProducts, saveJudgment }, { judgeProduct }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/judge"),
  ]);

  const configuredLimit = Number(process.env.INGEST_MAX_NEW ?? 30);
  const limit =
    Number.isFinite(configuredLimit) && configuredLimit > 0
      ? Math.floor(configuredLimit)
      : 30;
  const products = await getUnjudgedProducts(limit);
  const errors: string[] = [];
  let published = 0;

  console.log(`判定待ちから最大${limit}件を処理します…`);
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
