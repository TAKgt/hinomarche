/**
 * 公開商品の再確認順を、DB読み取りだけで匿名集計する。
 * 商品ID・商品名・URL・認証情報は出力しない。API・AI・DB書き込み・順位変更は行わない。
 */
import { config } from "dotenv";
import type { EditorialPriorityThemeId } from "../src/lib/editorial-priority";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const VALID_THEMES = new Set<EditorialPriorityThemeId>([
  "tsubame_kitchen",
  "rice_cookers",
  "imabari_furusato",
  "japanese_tea",
]);

function stringArg(name: string): string | null {
  const prefix = `${name}=`;
  return (
    process.argv
      .slice(2)
      .find((argument) => argument.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function integerArg(name: string, fallback: number): number {
  const value = stringArg(name);
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error(`${name}は1〜100で指定してください`);
  }
  return parsed;
}

function focusThemeArg(): EditorialPriorityThemeId | null {
  const value = stringArg("--focus-theme");
  if (value === null) return null;
  if (!VALID_THEMES.has(value as EditorialPriorityThemeId)) {
    throw new Error("focus themeが許可された4テーマに一致しません");
  }
  return value as EditorialPriorityThemeId;
}

async function main() {
  const [db, priority] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/freshness-priority"),
  ]);
  if (db.isDemoMode()) {
    throw new Error("Supabase未設定のため実データ計画は実行できません");
  }

  const products = await db.getProductIndexAuditRecords();
  let funnel:
    | Awaited<ReturnType<typeof db.getAdminProductFunnelReport>>
    | null = null;
  try {
    funnel = await db.getAdminProductFunnelReport();
  } catch {
    // 021未適用や一時的な読み取り失敗は0件にせず、metrics unavailableで継続する。
  }
  const metrics = funnel?.rows.map((row) => ({
    productId: row.productId,
    impressions28d: row.impressions28d,
    detailViews28d: row.detailViews28d,
    listingOutboundClicks28d: row.listingOutboundClicks28d,
    detailOutboundClicks28d: row.detailOutboundClicks28d,
  }));
  const evaluatedAt = new Date();
  const summary = priority.summarizeFreshnessPriorityQueue(
    products,
    evaluatedAt,
    {
      limit: integerArg("--limit", priority.FRESHNESS_PRIORITY_DEFAULT_LIMIT),
      maintenanceLeadDays: integerArg(
        "--maintenance-lead-days",
        priority.FRESHNESS_MAINTENANCE_LEAD_DAYS,
      ),
      focusTheme: focusThemeArg(),
      observedMetricDays: funnel?.observedDays ?? null,
      metrics: metrics ?? null,
    },
  );

  console.log(
    JSON.stringify(
      {
        ...summary,
        evaluatedAt: evaluatedAt.toISOString(),
        execution: {
          database: "read-only",
          externalProductApiCalls: 0,
          databaseWrites: 0,
          aiCalls: 0,
          rankingFieldUpdates: 0,
          shadowRankingUpdates: 0,
        },
        interpretation: {
          queueChangesPublicOrder: false,
          queueExecutesRefresh: false,
          metricsUnavailableMeaning: "warning-not-zero",
        },
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
          name: "name" in error ? String(error.name) : "PlanError",
          message: "鮮度優先キューの作成に失敗しました",
        }
      : { name: "PlanError", message: "鮮度優先キューの作成に失敗しました" };
  console.error(JSON.stringify(safeError));
  process.exit(1);
});
