/**
 * 楽天商品の既存リンクを楽天アフィリエイト直リンクへ移行する承認制スクリプト。
 *
 * 既定は読み取り専用プレビュー。実行時は対象件数・公開件数・変更件数・
 * 承認トークンを要求し、全URLをローカルへバックアップしてから更新する。
 * 商品内容・判定・公開状態・ランキングは変更しない。
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRakutenAffiliateUrl } from "../src/lib/rakuten";

config({ path: ".env.local" });
config();

const APPROVAL_TOKEN = "USER_APPROVED_RAKUTEN_DIRECT_LINK_MIGRATION";
const PAGE_SIZE = 1000;
const UPDATE_CONCURRENCY = 20;

type ProductLinkRow = {
  id: string;
  source_item_id: string;
  affiliate_url: string;
  item_url: string | null;
  is_published: boolean;
};

type PlannedMigration = ProductLinkRow & {
  targetUrl: string;
};

function stringArg(name: string): string | null {
  const prefix = `${name}=`;
  return (
    process.argv
      .slice(2)
      .find((arg) => arg.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function numberArg(name: string): number | null {
  const value = stringArg(name);
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isSupportedCurrentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "rakuten.co.jp" ||
      host.endsWith(".rakuten.co.jp") ||
      host === "moshimo.com" ||
      host.endsWith(".moshimo.com")
    );
  } catch {
    return false;
  }
}

function isRakutenAffiliateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "hb.afl.rakuten.co.jp" ||
      !url.pathname.startsWith("/hgc/")
    ) {
      return false;
    }
    const destination = url.searchParams.get("pc") ?? url.searchParams.get("m");
    return Boolean(destination && isSupportedCurrentUrl(destination));
  } catch {
    return false;
  }
}

async function fetchRakutenProducts(
  db: SupabaseClient,
): Promise<ProductLinkRow[]> {
  const rows: ProductLinkRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("products")
      .select("id,source_item_id,affiliate_url,item_url,is_published")
      .eq("source", "rakuten")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as ProductLinkRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function planMigrations(
  products: ProductLinkRow[],
  affiliateId: string,
): {
  migrations: PlannedMigration[];
  invalid: Array<{ id: string; reason: string }>;
  alreadyDirect: number;
  moshimoLinks: number;
} {
  const migrations: PlannedMigration[] = [];
  const invalid: Array<{ id: string; reason: string }> = [];
  let alreadyDirect = 0;
  let moshimoLinks = 0;

  for (const product of products) {
    try {
      // 楽天APIが返すaffiliateUrlはrafcid形式になり、既存DB移行用のURLとは
      // 文字列が一致しない。どちらも楽天公式の直リンクなので
      // 再移行せず、移行済みとして扱う。
      if (isRakutenAffiliateUrl(product.affiliate_url)) {
        alreadyDirect++;
        continue;
      }
      if (!isSupportedCurrentUrl(product.affiliate_url)) {
        throw new Error("現在のリンク先が楽天またはもしもではありません");
      }
      if (!product.item_url) {
        throw new Error("移行元の商品URLがありません");
      }
      const targetUrl = buildRakutenAffiliateUrl(product.item_url, affiliateId);
      if (product.affiliate_url === targetUrl) {
        alreadyDirect++;
        continue;
      }
      if (new URL(product.affiliate_url).hostname.endsWith("moshimo.com")) {
        moshimoLinks++;
      }
      migrations.push({ ...product, targetUrl });
    } catch (error) {
      invalid.push({
        id: product.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { migrations, invalid, alreadyDirect, moshimoLinks };
}

async function main() {
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!affiliateId) {
    throw new Error(
      ".env.localにRAKUTEN_AFFILIATE_IDを設定してから実行してください",
    );
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabaseのサーバー用接続情報が必要です");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(supabaseUrl, supabaseServiceRoleKey);
  const products = await fetchRakutenProducts(db);
  const { migrations, invalid, alreadyDirect, moshimoLinks } = planMigrations(
    products,
    affiliateId,
  );
  const published = products.filter((product) => product.is_published).length;
  const publishedMigrations = migrations.filter(
    (product) => product.is_published,
  ).length;
  const execute = process.argv.includes("--execute");

  console.log(
    JSON.stringify({
      mode: execute ? "execute" : "preview",
      totalRakutenProducts: products.length,
      publishedRakutenProducts: published,
      alreadyDirect,
      moshimoLinks,
      linksToMigrate: migrations.length,
      publishedLinksToMigrate: publishedMigrations,
      invalidLinks: invalid.length,
    }),
  );
  if (!execute) return;

  const expectedTotal = numberArg("--expected-total");
  const expectedPublished = numberArg("--expected-published");
  const expectedChanges = numberArg("--expected-changes");
  const approval = stringArg("--approval");
  if (
    expectedTotal !== products.length ||
    expectedPublished !== published ||
    expectedChanges !== migrations.length
  ) {
    throw new Error(
      "件数が承認値と一致しないため停止しました: " +
        `total=${products.length}/${expectedTotal}, ` +
        `published=${published}/${expectedPublished}, ` +
        `changes=${migrations.length}/${expectedChanges}`,
    );
  }
  if (approval !== APPROVAL_TOKEN) {
    throw new Error("承認トークンが一致しません");
  }
  if (invalid.length > 0) {
    throw new Error(`移行不能リンクが${invalid.length}件あるため停止しました`);
  }

  const backupDir = join(process.cwd(), ".backups", "rakuten-affiliate");
  await mkdir(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `hinomarche-rakuten-links-${Date.now()}.json`,
  );
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        products: products.map(
          ({
            id,
            source_item_id,
            affiliate_url,
            item_url,
            is_published,
          }) => ({
            id,
            sourceItemId: source_item_id,
            affiliateUrl: affiliate_url,
            itemUrl: item_url,
            isPublished: is_published,
          }),
        ),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(`バックアップ: ${backupPath}`);

  let updated = 0;
  for (
    let start = 0;
    start < migrations.length;
    start += UPDATE_CONCURRENCY
  ) {
    const batch = migrations.slice(start, start + UPDATE_CONCURRENCY);
    await Promise.all(
      batch.map(async (product) => {
        const { data, error } = await db
          .from("products")
          .update({ affiliate_url: product.targetUrl })
          .eq("id", product.id)
          .eq("affiliate_url", product.affiliate_url)
          .select("id");
        if (error) throw error;
        if (!data || data.length !== 1) {
          throw new Error(`同時更新を検知しました: ${product.id}`);
        }
        updated++;
      }),
    );
    if (updated % 200 === 0 || updated === migrations.length) {
      console.log(`進捗 ${updated}/${migrations.length}`);
    }
  }

  const after = await fetchRakutenProducts(db);
  const verification = planMigrations(after, affiliateId);
  const afterPublished = after.filter((product) => product.is_published).length;
  console.log(
    JSON.stringify({
      updated,
      totalRakutenProducts: after.length,
      publishedRakutenProducts: afterPublished,
      remainingChanges: verification.migrations.length,
      invalidLinks: verification.invalid.length,
      backupPath,
    }),
  );
  if (
    after.length !== expectedTotal ||
    afterPublished !== expectedPublished ||
    verification.migrations.length !== 0 ||
    verification.invalid.length !== 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
