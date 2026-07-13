import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runIngest } from "@/lib/ingest";
import { runShadowRanking } from "@/lib/ranking";

/**
 * Vercel Cron用エンドポイント(vercel.json で日次実行)。
 * VercelはCRON_SECRETを設定すると Authorization: Bearer <CRON_SECRET> を付けて叩く。
 */

export const maxDuration = 300;
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;

  const provided = header.slice("Bearer ".length);
  const secretBytes = Buffer.from(secret);
  const providedBytes = Buffer.from(provided);
  return (
    secretBytes.length === providedBytes.length &&
    timingSafeEqual(secretBytes, providedBytes)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runIngest();
    try {
      const ranking = await runShadowRanking();
      return NextResponse.json({ ...summary, ranking });
    } catch (e) {
      console.error("shadow ranking failed", e);
      summary.errors.push(`shadowランキング失敗: ${String(e)}`);
      return NextResponse.json({ ...summary, ranking: null });
    }
  } catch (e) {
    console.error("ingest cron failed", e);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
