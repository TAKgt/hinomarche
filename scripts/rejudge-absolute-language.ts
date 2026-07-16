/**
 * 禁止断定語を含む公開商品の根拠文を再判定する、承認制の修復スクリプト。
 *
 * 既定は読み取り専用のプレビュー。実行時は件数・上限費用・承認トークンをすべて要求する。
 * 匿名ファネルの判断前に商品順を変えないため、AIが返したscore/tierは監査記録だけに残し、
 * DBへは既存score/tierを保持した新しい根拠文と3要素チェックだけを追記する。
 */
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const FORBIDDEN_ABSOLUTE_LANGUAGE = /確実|完全|証明/;
const APPROVAL_TOKEN = "USER_APPROVED_ABSOLUTE_LANGUAGE_STAGE_1";

type CandidateRow = {
  id: string;
  source: "rakuten" | "amazon";
  source_item_id: string;
  title: string;
  description: string | null;
  maker: string | null;
  brand: string | null;
  image_url: string | null;
  price: number | null;
  affiliate_url: string;
  item_url: string | null;
  category_slug: string;
  review_count: number | null;
  review_average: number | null;
  affiliate_rate: number | null;
  search_rank: number | null;
  demand_score: number;
  featured_score: number;
  score: number;
  tier: "high" | "mid" | "low";
  evidence_type: string;
  evidence_text: string;
};

function numberArg(name: string): number | null {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!value) return null;
  const parsed = Number(value.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArg(name: string): string | null {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function main() {
  const [{ createClient }, { judgeProduct }] = await Promise.all([
    import("@supabase/supabase-js"),
    import("../src/lib/judge"),
  ]);

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await db
    .from("products_with_judgment")
    .select("*")
    .eq("is_published", true);
  if (error) throw error;

  const candidates = (data as CandidateRow[])
    .filter((row) => FORBIDDEN_ABSOLUTE_LANGUAGE.test(row.evidence_text))
    .sort(
      (a, b) =>
        b.featured_score - a.featured_score ||
        b.demand_score - a.demand_score ||
        (b.review_count ?? 0) - (a.review_count ?? 0) ||
        a.id.localeCompare(b.id),
    );
  const estimatedCostYen = Math.ceil(candidates.length * 0.5);
  const execute = process.argv.includes("--execute");

  console.log(
    JSON.stringify({
      mode: execute ? "execute" : "preview",
      publishedProducts: data.length,
      candidates: candidates.length,
      estimatedMaxCostYen: estimatedCostYen,
    }),
  );
  if (!execute) return;

  const expectedCount = numberArg("--expected-count");
  const approvedMaxCostYen = numberArg("--approved-max-cost-yen");
  const approval = stringArg("--approval");
  if (expectedCount !== candidates.length) {
    throw new Error(`対象件数が承認値と不一致です: expected=${expectedCount}, actual=${candidates.length}`);
  }
  if (approvedMaxCostYen == null || estimatedCostYen > approvedMaxCostYen) {
    throw new Error(
      `概算費用が承認上限を超えます: approved=${approvedMaxCostYen}, estimated=${estimatedCostYen}`,
    );
  }
  if (approval !== APPROVAL_TOKEN) {
    throw new Error("承認トークンが一致しないため、有料再判定を開始しません");
  }

  const auditPath = join(tmpdir(), `hinomarche-absolute-rejudge-${Date.now()}.json`);
  const audit = {
    startedAt: new Date().toISOString(),
    expectedCount,
    approvedMaxCostYen,
    scorePolicy: "preserve-existing-score-and-tier",
    candidates: candidates.map((row) => ({
      id: row.id,
      title: row.title,
      oldScore: row.score,
      oldTier: row.tier,
      oldEvidenceType: row.evidence_type,
      oldEvidenceText: row.evidence_text,
      featuredScore: row.featured_score,
    })),
    results: [] as Array<Record<string, unknown>>,
  };
  await writeFile(auditPath, JSON.stringify(audit, null, 2));
  console.log(`監査ファイル: ${auditPath}`);

  let succeeded = 0;
  let failed = 0;
  let stoppedReason: string | null = null;
  for (const [index, row] of candidates.entries()) {
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
        reviewCount: row.review_count,
        reviewAverage: row.review_average,
        affiliateRate: row.affiliate_rate,
        searchRank: row.search_rank,
      });
      if (FORBIDDEN_ABSOLUTE_LANGUAGE.test(judgment.evidenceText)) {
        throw new Error("再判定後の根拠文に禁止断定語が残っています");
      }

      const { error: insertError } = await db.from("judgments").insert({
        product_id: row.id,
        score: row.score,
        tier: row.tier,
        evidence_type: judgment.evidenceType,
        evidence_text: judgment.evidenceText,
        origin_check: judgment.checks.origin,
        company_check: judgment.checks.company,
        material_check: judgment.checks.material,
        confidence: judgment.confidence,
        model: `${judgment.model}:absolute-language-repair`,
      });
      if (insertError) throw insertError;

      succeeded++;
      audit.results.push({
        id: row.id,
        status: "succeeded",
        oldScore: row.score,
        proposedScore: judgment.score,
        storedScore: row.score,
        oldEvidenceText: row.evidence_text,
        newEvidenceText: judgment.evidenceText,
        checks: judgment.checks,
      });
    } catch (error) {
      failed++;
      const errorText = String(error);
      audit.results.push({ id: row.id, status: "failed", error: errorText });
      console.error(`失敗 ${index + 1}/${candidates.length} [${row.id}]: ${errorText}`);
      if (errorText.includes("credit balance is too low")) {
        stoppedReason = "anthropic-credit-balance-too-low";
      }
    }

    await writeFile(auditPath, JSON.stringify(audit, null, 2));
    if ((index + 1) % 10 === 0 || index + 1 === candidates.length) {
      console.log(`進捗 ${index + 1}/${candidates.length}: 成功${succeeded} / 失敗${failed}`);
    }
    if (stoppedReason) {
      console.error("Anthropic APIのクレジット残高不足を検知したため、追加試行を停止します");
      break;
    }
  }

  const { data: after, error: afterError } = await db
    .from("products_with_judgment")
    .select("id,evidence_text,featured_score,is_published")
    .eq("is_published", true);
  if (afterError) throw afterError;
  const remaining = after.filter((row) => FORBIDDEN_ABSOLUTE_LANGUAGE.test(row.evidence_text ?? ""));
  const beforeFeaturedScores = new Map(candidates.map((row) => [row.id, row.featured_score]));
  const changedFeaturedScores = after.filter(
    (row) => beforeFeaturedScores.has(row.id) && beforeFeaturedScores.get(row.id) !== row.featured_score,
  );

  const summary = {
    succeeded,
    failed,
    stoppedReason,
    remainingAbsoluteLanguageCandidates: remaining.length,
    changedFeaturedScores: changedFeaturedScores.length,
    auditPath,
  };
  console.log(JSON.stringify(summary));
  if (failed > 0 || remaining.length > 0 || changedFeaturedScores.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
