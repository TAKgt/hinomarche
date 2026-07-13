import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runShadowRanking } from "@/lib/ranking";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const ranking = await runShadowRanking();
    return NextResponse.json(ranking);
  } catch (error) {
    console.error("shadow ranking failed", error);
    return NextResponse.json({ error: "ranking failed" }, { status: 500 });
  }
}
