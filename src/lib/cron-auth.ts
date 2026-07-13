import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function isAuthorizedCronRequest(request: Request): boolean {
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

export function cronJsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
