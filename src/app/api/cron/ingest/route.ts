import { runIngest } from "@/lib/ingest";
import { cronJsonResponse, isAuthorizedCronRequest } from "@/lib/cron-auth";

/**
 * Vercel Cron用エンドポイント(vercel.json で日次実行)。
 * VercelはCRON_SECRETを設定すると Authorization: Bearer <CRON_SECRET> を付けて叩く。
 */

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return cronJsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const summary = await runIngest();
    return cronJsonResponse(summary);
  } catch (e) {
    console.error("ingest cron failed", e);
    return cronJsonResponse({ error: "ingest failed" }, 500);
  }
}
