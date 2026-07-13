import { getProduct, recordProductPageView } from "@/lib/db";
import { isSameOriginBrowserRequest } from "@/lib/request-security";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return Response.json({ accepted: false }, { status: 202 });
  }

  let productId: unknown;
  try {
    const body = await request.json();
    productId = body?.productId;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    return Response.json({ error: "Invalid product" }, { status: 400 });
  }

  const product = await getProduct(productId);
  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
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
