/**
 * 全公開商品を再判定するスクリプト: npx tsx scripts/rejudge.ts
 * 3要素チェック追加時など、判定スキーマを変えたあとに全件へ反映するために使う。
 * 判定は履歴として追記され、サイト表示は常に最新の判定を使う。
 * コスト目安: 1商品 約0.5円。
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const [{ createClient }, { judgeProduct }, { saveJudgment }] = await Promise.all([
    import("@supabase/supabase-js"),
    import("../src/lib/judge"),
    import("../src/lib/db"),
  ]);

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  // 最新判定に3要素チェックが付いていない商品だけを対象にする(判定済み商品の二重課金防止)
  const { data: products, error } = await db
    .from("products_with_judgment")
    .select("*")
    .is("origin_check", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  console.log(`再判定対象: ${products.length}件(推定コスト約${Math.ceil(products.length * 0.5)}円)`);

  let done = 0;
  let failed = 0;
  for (const row of products) {
    try {
      const judgment = await judgeProduct({
        source: row.source,
        sourceItemId: row.source_item_id,
        title: row.title,
        description: row.description,
        maker: row.maker,
        brand: row.brand,
        imageUrl: row.image_url,
        price: row.price,
        affiliateUrl: row.affiliate_url,
        itemUrl: row.item_url ?? "",
        categorySlug: row.category_slug,
      });
      await saveJudgment(row.id, judgment);
      done++;
      if (done % 20 === 0) console.log(`…${done}/${products.length} 件完了`);
    } catch (e) {
      failed++;
      console.error(`失敗 [${row.title.slice(0, 30)}]: ${String(e).slice(0, 150)}`);
    }
  }
  console.log(`\n完了: ${done}件 / 失敗: ${failed}件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
