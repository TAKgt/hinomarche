/**
 * ローカル実行用の収集スクリプト: npm run ingest
 * .env.local からAPIキーを読み込んで収集+AI判定を1回実行する。
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config(); // .env があればフォールバック

async function main() {
  // 環境変数を読み込んでからimportする(import hoisting回避)
  const { runIngest } = await import("../src/lib/ingest");

  console.log("収集を開始します…");
  const summary = await runIngest();

  console.log("\n===== 収集結果 =====");
  console.log(`取得: ${summary.fetched}件 / 新規: ${summary.created}件 / 更新: ${summary.updated}件`);
  console.log(`AI判定: ${summary.judged}件(うち公開: ${summary.published}件)`);
  if (summary.errors.length > 0) {
    console.log(`\nエラー ${summary.errors.length}件:`);
    for (const err of summary.errors) console.log(`  - ${err}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
