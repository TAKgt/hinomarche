import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

/**
 * Vercel Cron用エンドポイント(vercel.json で日次実行)。
 * VercelはCRON_SECRETを設定すると Authorization: Bearer <CRON_SECRET> を付けて叩く。
 */

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runIngest();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("ingest cron failed", e);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
