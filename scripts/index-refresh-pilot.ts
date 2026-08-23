/**
 * 燕三条・調理器具の1カテゴリ・1検索語pilot。
 *
 * 既定: DB読み取りだけのdry-run。
 * --external-preview: 楽天APIを1回読み、DBと比較する。書き込みとAI判定は0。
 * --execute: previewと件数・fingerprint・承認トークンが一致するときだけ、
 *            現在公開中の既存商品を最大30行更新する。
 * --rollback=<backup>: 更新直後の同じ行だけをバックアップから復元する。
 *
 * 商品ID・商品名・URL・認証情報は標準出力へ出さない。
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { config } from "dotenv";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildIndexRefreshPilotUpdatePayload,
  defaultIndexRefreshPilotScope,
  executeIndexRefreshApprovalToken,
  externalPreviewApprovalToken,
  planIndexRefreshPilot,
  validateIndexRefreshPilotScope,
  type IndexRefreshPilotPlan,
  type IndexRefreshPilotScope,
} from "../src/lib/index-refresh-pilot";
import { assessProductIndexQuality } from "../src/lib/product-index-quality";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const BACKUP_VERSION = 1;
const BACKUP_FIELDS = [
  "title",
  "description",
  "maker",
  "brand",
  "image_url",
  "price",
  "affiliate_url",
  "item_url",
  "review_count",
  "review_average",
  "affiliate_rate",
  "postage_included",
  "sale_start_at",
  "sale_end_at",
  "point_rate",
  "point_rate_start_at",
  "point_rate_end_at",
  "promotion_fetched_at",
  "price_updated_at",
  "fetched_at",
  "last_seen_at",
  "updated_at",
  "judgment_input_hash",
  "content_updated_at",
  "judgment_status",
  "is_published",
] as const;

type BackupField = (typeof BACKUP_FIELDS)[number];
type DatabaseRow = Record<string, unknown> & {
  id: string;
  updated_at: string | null;
};
type BackupEntry = {
  id: string;
  expectedBeforeUpdatedAt: string | null;
  expectedAfterUpdatedAt: string;
  before: Record<BackupField, unknown>;
  update: Record<string, unknown>;
};
type BackupCore = {
  version: number;
  createdAt: string;
  scope: {
    categorySlug: string;
    keywordSha256: string;
    limit: number;
  };
  resultFingerprint: string;
  rows: BackupEntry[];
};
type BackupFile = BackupCore & { checksum: string };

class PilotSafetyError extends Error {
  constructor(
    readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = "PilotSafetyError";
  }
}

function stringArg(name: string): string | null {
  const prefix = `${name}=`;
  return (
    process.argv
      .slice(2)
      .find((argument) => argument.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function numberArg(name: string): number | null {
  const value = stringArg(name);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function scopeFromArgs(): IndexRefreshPilotScope {
  const defaults = defaultIndexRefreshPilotScope();
  const limit = numberArg("--limit");
  const scope = {
    categorySlug: stringArg("--category") ?? defaults.categorySlug,
    keyword: stringArg("--keyword") ?? defaults.keyword,
    limit: limit ?? defaults.limit,
  };
  validateIndexRefreshPilotScope(scope);
  return scope;
}

function requireExplicitScope(scope: IndexRefreshPilotScope): void {
  if (
    stringArg("--category") === null ||
    stringArg("--keyword") === null ||
    numberArg("--limit") === null
  ) {
    throw new PilotSafetyError(
      "explicit_scope_required",
      "外部previewと実行ではカテゴリ・検索語・上限の明示が必要です",
    );
  }
  validateIndexRefreshPilotScope(scope);
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function checksum(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function rollbackApprovalToken(file: BackupFile): string {
  return `INDEX_REFRESH_ROLLBACK_${sha256(
    JSON.stringify({ checksum: file.checksum, rows: file.rows.length }),
  )
    .slice(0, 20)
    .toUpperCase()}`;
}

function output(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function loadReadOnlyState() {
  const [{ getCategories, getProductIndexAuditRecords, isDemoMode }] =
    await Promise.all([import("../src/lib/db")]);
  if (isDemoMode()) {
    throw new PilotSafetyError(
      "database_not_configured",
      "実データのpilotに必要な読み取り設定を確認できません",
    );
  }
  const [categories, records] = await Promise.all([
    getCategories(),
    getProductIndexAuditRecords(),
  ]);
  return { categories, records };
}

function assertConfiguredKeyword(
  categories: Awaited<ReturnType<typeof loadReadOnlyState>>["categories"],
  scope: IndexRefreshPilotScope,
): void {
  const category = categories.find(
    (candidate) => candidate.slug === scope.categorySlug && candidate.isActive,
  );
  if (!category || !category.searchKeywords.includes(scope.keyword)) {
    throw new PilotSafetyError(
      "scope_not_configured",
      "pilot対象が現在の有効カテゴリ・検索語と一致しません",
    );
  }
}

async function dryRun(scope: IndexRefreshPilotScope): Promise<void> {
  const { categories, records } = await loadReadOnlyState();
  assertConfiguredKeyword(categories, scope);
  const now = new Date();
  const categoryRecords = records.filter(
    (record) => record.categorySlug === scope.categorySlug,
  );
  const published = categoryRecords.filter((record) => record.isPublished);
  const assessments = published.map((record) =>
    assessProductIndexQuality(record, now),
  );
  output({
    scope: "index-refresh-pilot",
    mode: "dry-run-read-only",
    evaluatedAt: now.toISOString(),
    target: scope,
    execution: {
      databaseReads: 2,
      externalProductApiCalls: 0,
      databaseWrites: 0,
      aiCalls: 0,
    },
    baseline: {
      categoryRecords: categoryRecords.length,
      currentlyPublished: published.length,
      technicalEligible: assessments.filter(
        (assessment) => assessment.technicalEligible,
      ).length,
      lastConfirmationStale: assessments.filter((assessment) =>
        assessment.reasons.includes("last_confirmation_stale"),
      ).length,
    },
    previewMetrics: {
      reconfirmationSuccesses: null,
      technicalRecoveryCandidates: null,
      inputChanges: null,
      aiRejudgmentCandidates: null,
      elapsedMilliseconds: null,
      reason: "外部商品APIを実行しない既定dry-runのため未観測",
    },
    safeguards: {
      oneCategory: true,
      oneKeyword: true,
      maximumRows: scope.limit,
      newCandidatesWritten: 0,
      unpublishedCandidatesWritten: 0,
      rankingFieldsChanged: 0,
      shadowRankingChanged: 0,
      aiJudgmentsExecuted: 0,
    },
    externalPreviewApprovalToken: externalPreviewApprovalToken(scope),
  });
}

async function fetchExternalPreview(
  scope: IndexRefreshPilotScope,
  records: Awaited<ReturnType<typeof loadReadOnlyState>>["records"],
): Promise<{ plan: IndexRefreshPilotPlan; elapsedMilliseconds: number }> {
  const startedAt = performance.now();
  let fetched;
  try {
    const { searchRakuten } = await import("../src/lib/rakuten");
    fetched = await searchRakuten(scope.keyword, scope.categorySlug, scope.limit);
  } catch {
    throw new PilotSafetyError(
      "external_product_api_failed",
      "外部商品APIのpilot取得に失敗しました",
    );
  }
  const plan = planIndexRefreshPilot(records, fetched, new Date(), scope);
  return {
    plan,
    elapsedMilliseconds: Math.round(performance.now() - startedAt),
  };
}

async function externalPreview(scope: IndexRefreshPilotScope): Promise<void> {
  requireExplicitScope(scope);
  if (stringArg("--approval-token") !== externalPreviewApprovalToken(scope)) {
    throw new PilotSafetyError(
      "preview_approval_mismatch",
      "外部previewの承認トークンが一致しません",
    );
  }
  const { categories, records } = await loadReadOnlyState();
  assertConfiguredKeyword(categories, scope);
  const { plan, elapsedMilliseconds } = await fetchExternalPreview(
    scope,
    records,
  );
  output({
    scope: "index-refresh-pilot",
    mode: "external-preview-read-only",
    evaluatedAt: new Date().toISOString(),
    target: scope,
    execution: {
      externalProductApiCalls: 1,
      databaseWrites: 0,
      aiCalls: 0,
    },
    preview: plan.summary,
    resultFingerprint: plan.resultFingerprint,
    elapsedMilliseconds,
    executeApprovalToken: executeIndexRefreshApprovalToken(plan),
  });
}

async function adminDatabase(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new PilotSafetyError(
      "database_not_configured",
      "DB更新に必要なサーバー用設定を確認できません",
    );
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readTargetRows(
  db: SupabaseClient,
  ids: readonly string[],
): Promise<DatabaseRow[]> {
  if (ids.length < 1 || ids.length > 30) {
    throw new PilotSafetyError(
      "write_count_out_of_range",
      "pilotのDB更新件数が1〜30件の範囲外です",
    );
  }
  const { data, error } = await db.from("products").select("*").in("id", ids);
  if (error || !data || data.length !== ids.length) {
    throw new PilotSafetyError(
      "target_rows_changed",
      "pilot対象行を更新直前に一意に確認できません",
    );
  }
  return data as DatabaseRow[];
}

function pickBackupFields(row: DatabaseRow): Record<BackupField, unknown> {
  return Object.fromEntries(
    BACKUP_FIELDS.map((field) => [field, row[field] ?? null]),
  ) as Record<BackupField, unknown>;
}

async function createBackup(
  plan: IndexRefreshPilotPlan,
  rows: readonly DatabaseRow[],
  executeAt: Date,
): Promise<{ file: BackupFile; path: string }> {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const expectedAfterUpdatedAt = executeAt.toISOString();
  const entries = plan.updates.map((update): BackupEntry => {
    const row = rowById.get(update.existing.id);
    if (!row) {
      throw new PilotSafetyError(
        "target_rows_changed",
        "pilot対象行のバックアップを作成できません",
      );
    }
    return {
      id: row.id,
      expectedBeforeUpdatedAt: row.updated_at,
      expectedAfterUpdatedAt,
      before: pickBackupFields(row),
      update: buildIndexRefreshPilotUpdatePayload(
        update.existing,
        update.raw,
        executeAt,
      ),
    };
  });
  const core: BackupCore = {
    version: BACKUP_VERSION,
    createdAt: executeAt.toISOString(),
    scope: {
      categorySlug: plan.scope.categorySlug,
      keywordSha256: sha256(plan.scope.keyword),
      limit: plan.scope.limit,
    },
    resultFingerprint: plan.resultFingerprint,
    rows: entries,
  };
  const file: BackupFile = { ...core, checksum: checksum(core) };
  const directory = join(process.cwd(), ".backups", "index-refresh-pilot");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(
    directory,
    `tsubame-kitchen-${Date.now()}-${plan.resultFingerprint}.json`,
  );
  await writeFile(path, JSON.stringify(file, null, 2), { mode: 0o600 });
  return { file, path };
}

function assertExpectedPlan(plan: IndexRefreshPilotPlan): void {
  const expected = {
    fetched: numberArg("--expected-fetched"),
    existing: numberArg("--expected-existing"),
    writes: numberArg("--expected-writes"),
    inputChanges: numberArg("--expected-input-changes"),
    recoveries: numberArg("--expected-recoveries"),
    fingerprint: stringArg("--expected-fingerprint"),
  };
  if (
    expected.fetched !== plan.summary.apiResults ||
    expected.existing !== plan.summary.existingMatches ||
    expected.writes !== plan.summary.writeCandidates ||
    expected.inputChanges !== plan.summary.inputChanges ||
    expected.recoveries !== plan.summary.technicalRecoveryCandidates ||
    expected.fingerprint !== plan.resultFingerprint
  ) {
    throw new PilotSafetyError(
      "approved_preview_changed",
      "実行時の件数またはfingerprintが承認済みpreviewと一致しません",
    );
  }
  if (
    plan.summary.apiDuplicateRows !== 0 ||
    plan.summary.writeCandidates < 1 ||
    plan.summary.writeCandidates > plan.scope.limit
  ) {
    throw new PilotSafetyError(
      "unsafe_preview_result",
      "preview結果がpilotの安全条件を満たしません",
    );
  }
  if (
    stringArg("--approval-token") !== executeIndexRefreshApprovalToken(plan)
  ) {
    throw new PilotSafetyError(
      "execute_approval_mismatch",
      "DB更新の承認トークンがpreview結果と一致しません",
    );
  }
}

async function updateOne(
  db: SupabaseClient,
  entry: BackupEntry,
): Promise<void> {
  let query = db.from("products").update(entry.update).eq("id", entry.id);
  query = entry.expectedBeforeUpdatedAt
    ? query.eq("updated_at", entry.expectedBeforeUpdatedAt)
    : query.is("updated_at", null);
  const { data, error } = await query.select("id");
  if (error || !data || data.length !== 1) {
    throw new PilotSafetyError(
      "concurrent_update_detected",
      "pilot対象の同時更新を検知したため停止しました",
    );
  }
}

async function execute(scope: IndexRefreshPilotScope): Promise<void> {
  requireExplicitScope(scope);
  const { categories, records } = await loadReadOnlyState();
  assertConfiguredKeyword(categories, scope);
  const { plan, elapsedMilliseconds } = await fetchExternalPreview(
    scope,
    records,
  );
  assertExpectedPlan(plan);
  const db = await adminDatabase();
  const rows = await readTargetRows(
    db,
    plan.updates.map((update) => update.existing.id),
  );
  const executeAt = new Date();
  const backup = await createBackup(plan, rows, executeAt);

  let updated = 0;
  try {
    for (const entry of backup.file.rows) {
      await updateOne(db, entry);
      updated++;
    }
  } catch (error) {
    output({
      scope: "index-refresh-pilot",
      mode: "execute-stopped",
      updatedBeforeStop: updated,
      approvedWrites: plan.summary.writeCandidates,
      backupPath: backup.path,
      rollbackApprovalToken: rollbackApprovalToken(backup.file),
      databaseWrites: updated,
      aiCalls: 0,
      rankingFieldUpdates: 0,
      shadowRankingUpdates: 0,
    });
    throw error;
  }

  const after = await readTargetRows(
    db,
    plan.updates.map((update) => update.existing.id),
  );
  const verified = after.filter(
    (row) => row.updated_at === executeAt.toISOString(),
  ).length;
  if (verified !== updated) {
    throw new PilotSafetyError(
      "post_write_verification_failed",
      "pilot更新後の匿名件数検証に失敗しました",
    );
  }
  output({
    scope: "index-refresh-pilot",
    mode: "execute-complete",
    target: scope,
    preview: plan.summary,
    resultFingerprint: plan.resultFingerprint,
    elapsedMilliseconds,
    execution: {
      externalProductApiCalls: 1,
      databaseWrites: updated,
      productInserts: 0,
      productDeletes: 0,
      aiCalls: 0,
      rankingFieldUpdates: 0,
      shadowRankingUpdates: 0,
    },
    verification: { expected: updated, verified },
    backupPath: backup.path,
    rollbackApprovalToken: rollbackApprovalToken(backup.file),
  });
}

function validatedBackupPath(value: string): string {
  const root = resolve(process.cwd(), ".backups", "index-refresh-pilot");
  const path = resolve(value);
  const pathRelativeToRoot = relative(root, path);
  if (
    !pathRelativeToRoot ||
    pathRelativeToRoot.startsWith("..") ||
    resolve(root, pathRelativeToRoot) !== path
  ) {
    throw new PilotSafetyError(
      "invalid_backup_path",
      "rollbackはpilot専用バックアップだけを指定できます",
    );
  }
  return path;
}

function parseBackup(value: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new PilotSafetyError(
      "invalid_backup",
      "pilotバックアップを読み取れません",
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new PilotSafetyError(
      "invalid_backup",
      "pilotバックアップの形式が不正です",
    );
  }
  const file = parsed as BackupFile;
  if (
    file.version !== BACKUP_VERSION ||
    !Array.isArray(file.rows) ||
    file.rows.length < 1 ||
    file.rows.length > 30 ||
    !file.checksum
  ) {
    throw new PilotSafetyError(
      "invalid_backup",
      "pilotバックアップの件数またはバージョンが不正です",
    );
  }
  const { checksum: storedChecksum, ...core } = file;
  if (checksum(core) !== storedChecksum) {
    throw new PilotSafetyError(
      "backup_checksum_mismatch",
      "pilotバックアップのchecksumが一致しません",
    );
  }
  return file;
}

async function restoreOne(
  db: SupabaseClient,
  entry: BackupEntry,
): Promise<void> {
  const { data, error } = await db
    .from("products")
    .update(entry.before)
    .eq("id", entry.id)
    .eq("updated_at", entry.expectedAfterUpdatedAt)
    .select("id");
  if (error || !data || data.length !== 1) {
    throw new PilotSafetyError(
      "rollback_concurrent_update_detected",
      "pilot実行後の追加更新を検知したためrollbackを停止しました",
    );
  }
}

async function rollback(pathValue: string): Promise<void> {
  const path = validatedBackupPath(pathValue);
  const file = parseBackup(await readFile(path, "utf8"));
  const expectedWrites = numberArg("--expected-writes");
  if (expectedWrites !== file.rows.length) {
    throw new PilotSafetyError(
      "rollback_count_mismatch",
      "rollback件数が承認値と一致しません",
    );
  }
  if (stringArg("--approval-token") !== rollbackApprovalToken(file)) {
    throw new PilotSafetyError(
      "rollback_approval_mismatch",
      "rollbackの承認トークンが一致しません",
    );
  }
  const db = await adminDatabase();
  let restored = 0;
  for (const entry of file.rows) {
    await restoreOne(db, entry);
    restored++;
  }
  output({
    scope: "index-refresh-pilot",
    mode: "rollback-complete",
    expected: file.rows.length,
    restored,
    databaseWrites: restored,
    externalProductApiCalls: 0,
    aiCalls: 0,
    rankingFieldUpdates: 0,
    shadowRankingUpdates: 0,
  });
}

async function main(): Promise<void> {
  const externalPreviewMode = process.argv.includes("--external-preview");
  const executeMode = process.argv.includes("--execute");
  const rollbackPath = stringArg("--rollback");
  const selectedModes = [
    externalPreviewMode,
    executeMode,
    rollbackPath !== null,
  ].filter(Boolean).length;
  if (selectedModes > 1) {
    throw new PilotSafetyError(
      "multiple_modes",
      "external-preview・execute・rollbackは同時に指定できません",
    );
  }
  if (rollbackPath) {
    await rollback(rollbackPath);
    return;
  }
  const scope = scopeFromArgs();
  if (externalPreviewMode) {
    await externalPreview(scope);
    return;
  }
  if (executeMode) {
    await execute(scope);
    return;
  }
  await dryRun(scope);
}

main().catch((error: unknown) => {
  const safe =
    error instanceof PilotSafetyError
      ? {
          name: error.name,
          code: error.safeCode,
          message: error.message,
        }
      : {
          name: "PilotError",
          code: "unexpected_failure",
          message: "pilot処理に失敗しました",
        };
  console.error(JSON.stringify(safe));
  process.exit(1);
});
