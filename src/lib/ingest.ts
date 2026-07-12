import {
  getCategories,
  getUnjudgedProducts,
  isDemoMode,
  saveJudgment,
  upsertProduct,
} from "./db";
import { searchRakuten } from "./rakuten";
import { searchAmazon } from "./amazon";
import { judgeProduct } from "./judge";
import type { RawProduct } from "./types";

/**
 * 収集パイプライン本体。
 * カテゴリごとの検索キーワードで楽天/Amazonを検索 → upsert → 新商品をAI判定。
 * ローカル(scripts/ingest.ts)とVercel Cron(/api/cron/ingest)の両方から呼ばれる。
 */

export interface IngestSummary {
  fetched: number;
  created: number;
  updated: number;
  judged: number;
  published: number;
  errors: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runIngest(): Promise<IngestSummary> {
  if (isDemoMode()) {
    throw new Error(
      "デモモードでは収集できません。SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定してください"
    );
  }

  const summary: IngestSummary = {
    fetched: 0,
    created: 0,
    updated: 0,
    judged: 0,
    published: 0,
    errors: [],
  };

  // 1回のCron実行で判定する新商品数の上限(実行時間とAPIコストの暴走防止)
  const maxNew = Number(process.env.INGEST_MAX_NEW ?? 30);
  let amazonEnabled = Boolean(
    process.env.AMAZON_CREDENTIAL_ID &&
      process.env.AMAZON_CREDENTIAL_SECRET &&
      process.env.AMAZON_PARTNER_TAG
  );

  const categories = await getCategories();

  for (const category of categories) {
    for (const keyword of category.searchKeywords) {
      const batches: RawProduct[][] = [];

      try {
        batches.push(await searchRakuten(keyword, category.slug));
      } catch (e) {
        summary.errors.push(`楽天検索失敗 [${keyword}]: ${String(e)}`);
      }
      await sleep(1100); // 楽天API・PA-APIとも約1リクエスト/秒に抑える

      if (amazonEnabled) {
        try {
          batches.push(await searchAmazon(keyword, category.slug));
        } catch (e) {
          summary.errors.push(`Amazon検索失敗 [${keyword}]: ${String(e)}`);
          // アカウントの利用資格なし(売上要件未達)の間は、この回の残りをスキップ
          if (String(e).includes("AssociateNotEligible")) {
            amazonEnabled = false;
            summary.errors.push(
              "Amazon: アソシエイトの利用資格未達のため今回はスキップ(売上3件達成後に自動再開)"
            );
          }
        }
        await sleep(1100);
      }

      for (const raw of batches.flat()) {
        summary.fetched++;
        try {
          const newId = await upsertProduct(raw);
          if (newId) summary.created++;
          else summary.updated++;
        } catch (e) {
          summary.errors.push(`upsert失敗 [${raw.title.slice(0, 30)}]: ${String(e)}`);
        }
      }
    }
  }

  // 未判定バックログを古い順にmaxNew件まで判定(今回の新規もここに含まれる)
  const toJudge = await getUnjudgedProducts(maxNew);
  for (const { id, raw } of toJudge) {
    try {
      const judgment = await judgeProduct(raw);
      await saveJudgment(id, judgment);
      summary.judged++;
      summary.published++;
    } catch (e) {
      summary.errors.push(`判定失敗 [${raw.title.slice(0, 30)}]: ${String(e)}`);
    }
  }

  return summary;
}
