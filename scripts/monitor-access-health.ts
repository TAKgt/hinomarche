/**
 * 鮮度とサイト内ファネルをDB読み取りだけで匿名監視する。
 * Search Console・GA4・CWVを取得したとは扱わず、未取得値を0にしない。
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const [db, health] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/access-health"),
  ]);
  if (db.isDemoMode()) {
    throw new Error("Supabase未設定のため実データ監視は実行できません");
  }

  const products = await db.getProductIndexAuditRecords();
  let funnel:
    | Awaited<ReturnType<typeof db.getAdminProductFunnelReport>>
    | null = null;
  try {
    funnel = await db.getAdminProductFunnelReport();
  } catch {
    // 読み取れない計測値はnull / warningで扱い、0件を作らない。
  }
  const summary = health.summarizeAccessHealth(
    products,
    funnel
      ? {
          observedDays: funnel.observedDays,
          rows: funnel.rows.map((row) => ({
            productId: row.productId,
            impressions28d: row.impressions28d,
            detailViews28d: row.detailViews28d,
            listingOutboundClicks28d: row.listingOutboundClicks28d,
            detailOutboundClicks28d: row.detailOutboundClicks28d,
          })),
        }
      : null,
    new Date(),
  );

  console.log(
    JSON.stringify(
      {
        ...summary,
        evaluatedAt: new Date().toISOString(),
        notes: {
          searchConsoleAndGa4:
            "既存権限のUIまたは承認済みconnectorで別途読み取り、同じ28日条件で記録する",
          coreWebVitals:
            "フィールドデータがpoorまたはneeds-improvementの場合だけ個別診断へ進む",
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
          name: "name" in error ? String(error.name) : "MonitorError",
          message: "アクセス健全性の読み取り監視に失敗しました",
        }
      : {
          name: "MonitorError",
          message: "アクセス健全性の読み取り監視に失敗しました",
        };
  console.error(JSON.stringify(safeError));
  process.exit(1);
});
