import {
  getCategories,
  getCategoryInventory,
  getUnjudgedProducts,
  isDemoMode,
  saveJudgment,
  upsertProduct,
} from "./db";
import { searchRakuten } from "./rakuten";
import { searchAmazon } from "./amazon";
import { judgeProduct } from "./judge";
import type { RawProduct } from "./types";
import { planUnderfilledCategories } from "./ingest-plan";
import { categoryKeywordWindow, dailyWindow } from "./ingest-rotation";

/**
 * 収集パイプライン本体。
 * カテゴリごとの検索キーワードで楽天/Amazonを検索 → upsert → 新商品をAI判定。
 * ローカル(scripts/ingest.ts)とVercel Cron(/api/cron/ingest)の両方から呼ばれる。
 */

export interface IngestSummary {
  categorySlugs: string[];
  selectionMode: "requested" | "underfilled" | "rotation";
  categoryTarget: number;
  skippedSearchSlugs: string[];
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
    categorySlugs: [],
    selectionMode: "rotation",
    categoryTarget: 12,
    skippedSearchSlugs: [],
    fetched: 0,
    created: 0,
    updated: 0,
    judged: 0,
    published: 0,
    errors: [],
  };

  // 1回のCron実行で判定する新商品数の上限(実行時間とAPIコストの暴走防止)
  const isVercel = process.env.VERCEL === "1";
  const configuredMaxNew = Number(process.env.INGEST_MAX_NEW ?? (isVercel ? 5 : 30));
  const maxNew = Math.max(
    0,
    Math.floor(Number.isFinite(configuredMaxNew) ? configuredMaxNew : isVercel ? 5 : 30),
  );
  const configuredKeywordLimit = Number(
    process.env.INGEST_KEYWORDS_PER_CATEGORY ?? (isVercel ? 1 : 2),
  );
  const keywordLimit =
    Number.isFinite(configuredKeywordLimit) && configuredKeywordLimit > 0
      ? Math.floor(configuredKeywordLimit)
      : isVercel
        ? 1
        : 2;
  let amazonEnabled = Boolean(
    process.env.AMAZON_CREDENTIAL_ID &&
      process.env.AMAZON_CREDENTIAL_SECRET &&
      process.env.AMAZON_PARTNER_TAG
  );

  const requestedSlugs = (process.env.INGEST_CATEGORY_SLUGS ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const allCategories = await getCategories();
  const matchedCategories =
    requestedSlugs.length > 0
      ? allCategories.filter((category) => requestedSlugs.includes(category.slug))
      : allCategories;
  if (requestedSlugs.length > 0 && matchedCategories.length === 0) {
    throw new Error("INGEST_CATEGORY_SLUGSに一致する有効カテゴリがありません");
  }
  const configuredCategoryLimit = Number(
    process.env.INGEST_CATEGORIES_PER_RUN ?? (isVercel ? 4 : matchedCategories.length),
  );
  const categoryLimit =
    Number.isFinite(configuredCategoryLimit) && configuredCategoryLimit > 0
      ? Math.floor(configuredCategoryLimit)
      : isVercel
        ? 4
        : matchedCategories.length;
  const configuredCategoryTarget = Number(process.env.INGEST_MIN_CATEGORY_PRODUCTS ?? 12);
  const categoryTarget =
    Number.isFinite(configuredCategoryTarget) && configuredCategoryTarget > 0
      ? Math.floor(configuredCategoryTarget)
      : 12;
  summary.categoryTarget = categoryTarget;

  let categories = matchedCategories;
  let judgmentLimits: Record<string, number> | undefined;
  let searchSlugs: Set<string> | undefined;
  if (requestedSlugs.length > 0) {
    summary.selectionMode = "requested";
  } else {
    try {
      const inventory = await getCategoryInventory();
      const underfilledPlan = planUnderfilledCategories(
        matchedCategories,
        inventory,
        categoryLimit,
        categoryTarget,
      );
      if (underfilledPlan) {
        categories = underfilledPlan.categories;
        judgmentLimits = underfilledPlan.judgmentLimits;
        searchSlugs = underfilledPlan.searchSlugs;
        summary.selectionMode = "underfilled";
      } else {
        categories = dailyWindow(matchedCategories, categoryLimit);
        summary.selectionMode = "rotation";
      }
    } catch (error) {
      summary.errors.push(`カテゴリ充足度の取得失敗: ${String(error)}`);
      categories = dailyWindow(matchedCategories, categoryLimit);
      summary.selectionMode = "rotation";
    }
  }
  summary.categorySlugs = categories.map((category) => category.slug);

  for (const category of categories) {
    if (searchSlugs && !searchSlugs.has(category.slug)) {
      summary.skippedSearchSlugs.push(category.slug);
      continue;
    }
    // ジャンル増加後もCron時間とAPI費用を一定に保ち、検索語をカテゴリ別に巡回する。
    for (const keyword of categoryKeywordWindow(
      category.searchKeywords,
      keywordLimit,
      category.slug,
    )) {
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
              "Amazon: アソシエイトの利用資格未達のため今回はスキップ(資格条件達成後に自動再開)"
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
  const toJudge = await getUnjudgedProducts(
    maxNew,
    categories.map((category) => category.slug),
    judgmentLimits,
  );
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
