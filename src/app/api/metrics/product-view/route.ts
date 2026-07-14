import { getProduct, recordProductPageView } from "@/lib/db";
import { shouldRecordPublicMetric } from "@/lib/request-security";
import { JsonRequestError, readJsonObject } from "@/lib/request-json";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!shouldRecordPublicMetric(request)) {
    return Response.json({ accepted: false }, { status: 202 });
  }

  let productId: unknown;
  try {
    const body = await readJsonObject(request, 1024);
    productId = body?.productId;
  } catch (error) {
    const status = error instanceof JsonRequestError ? error.status : 400;
    return Response.json(
      { error: "Invalid body" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    return Response.json(
      { error: "Invalid product" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const product = await getProduct(productId);
  if (!product) {
    return Response.json(
      { error: "Product not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await recordProductPageView(productId);
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
