/**
 * 楽天商品のもしもa_idを媒体専用IDへ移行する承認制スクリプト。
 *
 * 既定は読み取り専用プレビュー。実行時は対象件数・公開件数・承認トークンを要求し、
 * 全URLをバックアップしてからa_id部分だけを更新する。商品順・判定・ランキングは触らない。
 */
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import type { SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const APPROVAL_TOKEN = "USER_APPROVED_MOSHIMO_LINK_MIGRATION";
const PAGE_SIZE = 1000;
const UPDATE_CONCURRENCY = 20;
const MOSHIMO_LINK = /^https:\/\/af\.moshimo\.com\/af\/c\/click\?/;
const A_ID_PARAM = /([?&]a_id=)([^&]+)/;

type ProductLinkRow = {
  id: string;
  affiliate_url: string;
  is_published: boolean;
};

function stringArg(name: string): string | null {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function numberArg(name: string): number | null {
  const value = stringArg(name);
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function migrateUrl(url: string, targetAId: string): { currentAId: string; migratedUrl: string } {
  if (!MOSHIMO_LINK.test(url)) throw new Error("もしもクリックURLではありません");
  const match = url.match(A_ID_PARAM);
  if (!match || match.index == null) throw new Error("a_idがありません");
  const valueStart = match.index + match[1].length;
  return {
    currentAId: match[2],
    migratedUrl: `${url.slice(0, valueStart)}${targetAId}${url.slice(valueStart + match[2].length)}`,
  };
}

async function fetchRakutenProducts(
  db: SupabaseClient,
): Promise<ProductLinkRow[]> {
  const rows: ProductLinkRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("products")
      .select("id,affiliate_url,is_published")
      .eq("source", "rakuten")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data as ProductLinkRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function updateLocalEnv(targetAId: string): Promise<void> {
  const path = ".env.local";
  const source = await readFile(path, "utf8");
  const pattern = /^MOSHIMO_A_ID=.*$/m;
  if (!pattern.test(source)) throw new Error(".env.localにMOSHIMO_A_IDがありません");
  const updated = source.replace(pattern, `MOSHIMO_A_ID=${targetAId}`);
  const tempPath = `${path}.tmp-${Date.now()}`;
  const currentStat = await stat(path);
  await writeFile(tempPath, updated, { mode: currentStat.mode });
  await rename(tempPath, path);
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const targetAId = stringArg("--target-a-id");
  if (!targetAId || !/^\d+$/.test(targetAId)) {
    throw new Error("--target-a-id=<数字> が必要です");
  }

  const products = await fetchRakutenProducts(db);
  const invalid: Array<{ id: string; reason: string }> = [];
  const migrations: Array<ProductLinkRow & { currentAId: string; migratedUrl: string }> = [];
  const currentAIds = new Set<string>();
  let alreadyTarget = 0;

  for (const product of products) {
    try {
      const migrated = migrateUrl(product.affiliate_url, targetAId);
      currentAIds.add(migrated.currentAId);
      if (migrated.currentAId === targetAId) {
        alreadyTarget++;
      } else {
        migrations.push({ ...product, ...migrated });
      }
    } catch (error) {
      invalid.push({ id: product.id, reason: String(error) });
    }
  }

  const published = products.filter((product) => product.is_published).length;
  const publishedMigrations = migrations.filter((product) => product.is_published).length;
  const execute = process.argv.includes("--execute");
  console.log(
    JSON.stringify({
      mode: execute ? "execute" : "preview",
      totalRakutenProducts: products.length,
      publishedRakutenProducts: published,
      alreadyTarget,
      linksToMigrate: migrations.length,
      publishedLinksToMigrate: publishedMigrations,
      uniqueCurrentAIds: currentAIds.size,
      invalidLinks: invalid.length,
    }),
  );
  if (!execute) return;

  const expectedTotal = numberArg("--expected-total");
  const expectedPublished = numberArg("--expected-published");
  const approval = stringArg("--approval");
  if (expectedTotal !== products.length || expectedPublished !== published) {
    throw new Error(
      `件数が承認値と不一致です: total=${products.length}/${expectedTotal}, published=${published}/${expectedPublished}`,
    );
  }
  if (approval !== APPROVAL_TOKEN) throw new Error("承認トークンが一致しません");
  if (invalid.length > 0) throw new Error(`形式不正リンクが${invalid.length}件あるため停止します`);
  if (currentAIds.size !== 1 || alreadyTarget > 0) {
    throw new Error("移行前a_idが単一、かつ専用ID移行済み0件ではないため停止します");
  }

  const backupDir = join(process.cwd(), ".backups", "moshimo");
  await mkdir(backupDir, { recursive: true });
  const backupPath = join(backupDir, `hinomarche-moshimo-links-${Date.now()}.json`);
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        targetAId,
        products: products.map(({ id, affiliate_url, is_published }) => ({
          id,
          affiliateUrl: affiliate_url,
          isPublished: is_published,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`バックアップ: ${backupPath}`);

  let updated = 0;
  for (let start = 0; start < migrations.length; start += UPDATE_CONCURRENCY) {
    const batch = migrations.slice(start, start + UPDATE_CONCURRENCY);
    await Promise.all(
      batch.map(async (product) => {
        const { data, error } = await db
          .from("products")
          .update({ affiliate_url: product.migratedUrl })
          .eq("id", product.id)
          .eq("affiliate_url", product.affiliate_url)
          .select("id");
        if (error) throw error;
        if (data.length !== 1) throw new Error(`同時更新を検知しました: ${product.id}`);
        updated++;
      }),
    );
    if (updated % 200 === 0 || updated === migrations.length) {
      console.log(`進捗 ${updated}/${migrations.length}`);
    }
  }

  await updateLocalEnv(targetAId);
  const after = await fetchRakutenProducts(db);
  const remaining = after.filter((product) => migrateUrl(product.affiliate_url, targetAId).currentAId !== targetAId);
  const afterPublished = after.filter((product) => product.is_published).length;
  const configuredAId = process.env.MOSHIMO_A_ID;
  const summary = {
    updated,
    totalRakutenProducts: after.length,
    publishedRakutenProducts: afterPublished,
    oldIdRemaining: remaining.length,
    localEnvWasChanged: configuredAId !== targetAId,
    backupPath,
  };
  console.log(JSON.stringify(summary));
  if (after.length !== expectedTotal || afterPublished !== expectedPublished || remaining.length !== 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
