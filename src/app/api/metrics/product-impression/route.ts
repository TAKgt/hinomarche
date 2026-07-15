import { recordProductImpressions } from "@/lib/db";
import {
  isImpressionPlacement,
  parseProductPlacement,
  type ProductPlacement,
} from "@/lib/product-metrics";
import { JsonRequestError, readJsonObject } from "@/lib/request-json";
import { shouldRecordPublicMetric } from "@/lib/request-security";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Impression = ProductPlacement & { productId: string };

function parseImpression(value: unknown): Impression | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.productId !== "string" || !UUID_PATTERN.test(record.productId)) {
    return null;
  }

  const params = new URLSearchParams({
    surface: typeof record.surface === "string" ? record.surface : "",
    context: typeof record.surfaceKey === "string" ? record.surfaceKey : "",
    position: String(record.position ?? ""),
  });
  const placement = parseProductPlacement(params);
  return placement && isImpressionPlacement(placement)
    ? { productId: record.productId, ...placement }
    : null;
}

export async function POST(request: Request) {
  if (!shouldRecordPublicMetric(request)) {
    return Response.json(
      { accepted: false },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(request, 10 * 1024);
  } catch (error) {
    const status = error instanceof JsonRequestError ? error.status : 400;
    return Response.json(
      { error: "Invalid body" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    !Array.isArray(body.impressions) ||
    body.impressions.length === 0 ||
    body.impressions.length > 20
  ) {
    return Response.json(
      { error: "Invalid impressions" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = body.impressions.map(parseImpression);
  if (parsed.some((item) => item === null)) {
    return Response.json(
      { error: "Invalid impressions" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const unique = new Map(
    (parsed as Impression[]).map((item) => [
      `${item.surface}:${item.surfaceKey ?? ""}:${item.productId}`,
      item,
    ]),
  );

  try {
    await recordProductImpressions([...unique.values()]);
  } catch (error) {
    console.error("Failed to record product impressions", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }

  return Response.json(
    { accepted: true },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
