import { timingSafeEqual } from "node:crypto";

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
