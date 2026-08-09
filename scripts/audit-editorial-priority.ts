/**
 * 編集優先候補を管理権限で読み取り専用集計する。
 * 商品ID・商品名・URL・認証情報は出力しない。
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const [{ getProductIndexAuditRecords, isDemoMode }, { selectEditorialPriorityCandidates }] =
    await Promise.all([
      import("../src/lib/db"),
      import("../src/lib/editorial-priority"),
    ]);

  if (isDemoMode()) {
    throw new Error("Supabase未設定のため実データ監査は実行できません");
  }

  const evaluatedAt = new Date();
  const products = await getProductIndexAuditRecords();
  const selection = selectEditorialPriorityCandidates(products, evaluatedAt);
  const themeCounts = Object.fromEntries(
    Object.entries(selection.selectedByTheme).map(([theme, selected]) => [
      theme,
      {
        selected,
        matchingTechnicalEligible: selection.matchingEligibleByTheme[
          theme as keyof typeof selection.matchingEligibleByTheme
        ],
      },
    ]),
  );

  console.log(
    JSON.stringify(
      {
        scope: "editorial-priority-read-only",
        evaluatedAt: evaluatedAt.toISOString(),
        targetPerTheme: selection.targetPerTheme,
        selectedTotal: selection.candidates.length,
        technicalEligiblePool: selection.technicalEligiblePool,
        informationInconsistentExcluded:
          selection.informationInconsistentExcluded,
        editorialStatus: "candidate-not-human-verified",
        themeCounts,
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
          message: "監査処理に失敗しました",
        }
      : { name: "AuditError", message: "監査処理に失敗しました" };
  console.error(JSON.stringify(safeError));
  process.exit(1);
});
