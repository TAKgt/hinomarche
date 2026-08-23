/**
 * 公開商品の30日鮮度を維持できる集合を、DB読み取りだけでdry-runする。
 * 商品ID・商品名・URL・認証情報は出力しない。外部商品API・AI・DB書き込みは行わない。
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

function focusThemeFromArgs(): EditorialPriorityThemeId | null {
  const prefix = "--focus-theme=";
  const value = process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
  if (!value) return null;
  if (!VALID_THEMES.has(value as EditorialPriorityThemeId)) {
    throw new Error("focus themeが許可された4テーマに一致しません");
  }
  return value as EditorialPriorityThemeId;
}

async function main() {
  const [
    {
      getProductEvidenceAuditRecords,
      getProductIndexAuditRecords,
      isDemoMode,
    },
    { publicEditorialEvidenceByProduct },
    { planIndexRefresh },
  ] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/product-editorial-evidence"),
    import("../src/lib/index-refresh-plan"),
  ]);

  if (isDemoMode()) {
    throw new Error("Supabase未設定のため実データ計画は実行できません");
  }

  const evaluatedAt = new Date();
  const [products, evidenceRecords] = await Promise.all([
    getProductIndexAuditRecords(),
    getProductEvidenceAuditRecords(),
  ]);
  const evidenceById = evidenceRecords
    ? publicEditorialEvidenceByProduct(evidenceRecords)
    : new Map();
  const plan = planIndexRefresh(products, evaluatedAt, {
    focusTheme: focusThemeFromArgs(),
    editorialEvidenceByProductId: evidenceById,
  });
  const { scope: maintenanceScope, ...planDetails } = plan;

  console.log(
    JSON.stringify(
      {
        scope: "index-refresh-dry-run-read-only",
        evaluatedAt: evaluatedAt.toISOString(),
        execution: {
          externalProductApiCalls: 0,
          databaseWrites: 0,
          aiJudgments: 0,
        },
        assumptions: {
          dailyCron: "one-run",
          cronMaxDurationSeconds: 60,
          categoriesPerRun: 4,
          keywordsPerCategory: 1,
          rakutenRowsPerKeywordMaximum: 30,
          aiJudgmentsPerRunMaximum: 5,
          empiricalCoverageMeaning:
            "直近30日以内に確認された公開商品のユニーク件数を30で割った観測proxy。Cron完走や上位30件への再出現は未検証。",
        },
        maintenanceScope,
        ...planDetails,
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
          code: "code" in error ? String(error.code) : undefined,
          message: "更新dry-run計画の作成に失敗しました",
        }
      : { name: "PlanError", message: "更新dry-run計画の作成に失敗しました" };
  console.error(JSON.stringify(safeError));
  process.exit(1);
});
