import { NextRequest, NextResponse } from "next/server";
import { getProduct, recordOutboundClick } from "@/lib/db";
import { amazonSearchUrl, rakutenSearchUrl } from "@/lib/crosslinks";
import { isSameOriginBrowserRequest } from "@/lib/request-security";

type Destination = "primary" | "cross";
type Merchant = "rakuten" | "amazon";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAllowedDestination(value: string | null): value is Destination {
  return value === "primary" || value === "cross";
}

function isAllowedOutboundUrl(value: string, merchant: Merchant): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    if (merchant === "amazon") {
      return host === "amazon.co.jp" || host.endsWith(".amazon.co.jp");
    }
    return (
      host === "rakuten.co.jp" ||
      host.endsWith(".rakuten.co.jp") ||
      host === "moshimo.com" ||
      host.endsWith(".moshimo.com")
    );
  } catch {
    return false;
  }
}

function redirectWithoutCaching(url: string): NextResponse {
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const destination = request.nextUrl.searchParams.get("target");

  if (!UUID_PATTERN.test(id) || !isAllowedDestination(destination)) {
    return Response.json({ error: "Invalid link" }, { status: 400 });
  }

  const product = await getProduct(id);
  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const primaryMerchant: Merchant = product.source;
  const merchant: Merchant =
    destination === "primary"
      ? primaryMerchant
      : primaryMerchant === "rakuten"
        ? "amazon"
        : "rakuten";
  const outboundUrl =
    destination === "primary"
      ? product.affiliateUrl
      : product.source === "rakuten"
        ? amazonSearchUrl(product.title)
        : rakutenSearchUrl(product.title);

  if (!isAllowedOutboundUrl(outboundUrl, merchant)) {
    console.error("Blocked an invalid outbound product URL", {
      productId: id,
      destination,
      merchant,
    });
    return Response.json({ error: "Invalid merchant link" }, { status: 502 });
  }

  if (isSameOriginBrowserRequest(request)) {
    try {
      await recordOutboundClick({ productId: id, destination, merchant });
    } catch (error) {
      console.error("Failed to record outbound click", {
        productId: id,
        destination,
        merchant,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return redirectWithoutCaching(outboundUrl);
}
