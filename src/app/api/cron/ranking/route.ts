import { cronJsonResponse, isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runShadowRanking } from "@/lib/ranking";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return cronJsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const ranking = await runShadowRanking();
    return cronJsonResponse(ranking);
  } catch (error) {
    console.error("shadow ranking failed", error);
    return cronJsonResponse({ error: "ranking failed" }, 500);
  }
}
