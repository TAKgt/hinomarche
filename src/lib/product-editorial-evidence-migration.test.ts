import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/022_product_editorial_evidence.sql", import.meta.url),
  "utf8",
);
const rollback = readFileSync(
  new URL("../../supabase/rollbacks/022_product_editorial_evidence.rollback.sql", import.meta.url),
  "utf8",
);

test("022は既存商品を更新せず新規根拠テーブルを追加する", () => {
  assert.match(migration, /create table public\.product_evidence/);
  assert.doesNotMatch(migration, /update\s+public\.products\s+set/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.products/i);
});

test("直接公開を閉じ、公開RPCだけをanonへ許可する", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.product_evidence from anon, authenticated/);
  assert.match(migration, /grant execute on function public\.get_public_product_evidence\(uuid\)/);
  assert.doesNotMatch(migration, /grant select on (table )?public\.product_evidence/i);
});

test("商品変更時の自動非公開化とRPC側のハッシュ再確認がある", () => {
  assert.match(migration, /create trigger products_hide_stale_evidence/);
  assert.match(migration, /set\s+is_public = false/i);
  assert.match(migration, /evidence\.product_input_hash = product\.judgment_input_hash/);
  assert.match(migration, /order by judgment\.judged_at desc nulls last, judgment\.id desc/);
});

test("ロールバックは公開関数・トリガー・テーブルを順に削除する", () => {
  assert.match(rollback, /drop function if exists public\.get_public_product_evidence\(uuid\)/);
  assert.match(rollback, /drop trigger if exists products_hide_stale_evidence/);
  assert.match(rollback, /drop trigger if exists product_evidence_publication_guard/);
  assert.match(rollback, /drop table if exists public\.product_evidence/);
});
