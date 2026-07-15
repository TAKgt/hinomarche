import { getProduct, recordProductPageView } from "@/lib/db";
import { shouldRecordPublicMetric } from "@/lib/request-security";
import { JsonRequestError, readJsonObject } from "@/lib/request-json";
import {
  isImpressionPlacement,
  parseProductPlacement,
  type ProductPlacement,
} from "@/lib/product-metrics";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!shouldRecordPublicMetric(request)) {
    return Response.json({ accepted: false }, { status: 202 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(request, 1024);
  } catch (error) {
    const status = error instanceof JsonRequestError ? error.status : 400;
    return Response.json(
      { error: "Invalid body" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const productId = body.productId;

  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    return Response.json(
      { error: "Invalid product" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const hasPlacement = [body.surface, body.surfaceKey, body.position].some(
    (value) => value !== null && value !== undefined && value !== "",
  );
  let placement: ProductPlacement | null = null;
  if (hasPlacement) {
    const params = new URLSearchParams({
      surface: typeof body.surface === "string" ? body.surface : "",
      context: typeof body.surfaceKey === "string" ? body.surfaceKey : "",
      position: String(body.position ?? ""),
    });
    const parsed = parseProductPlacement(params);
    if (!parsed || !isImpressionPlacement(parsed)) {
      return Response.json(
        { error: "Invalid placement" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    placement = parsed;
  }

  const product = await getProduct(productId);
  if (!product) {
    return Response.json(
      { error: "Product not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await recordProductPageView(productId, placement);
  } catch (error) {
    console.error("Failed to record product page view", {
      productId,
      error: error instanceof Error ? error.message : "unknown error",
    });
  }

  return Response.json(
    { accepted: true },
    { status: 202, headers: { "Cache-Control": "no-store" } }
  );
}
