import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_USERNAME = process.env.ANALYTICS_ADMIN_USERNAME ?? "hinomarche";

async function safeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function basicCredentials(request: NextRequest): [string, string] | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return [decoded.slice(0, separator), decoded.slice(separator + 1)];
  } catch {
    return null;
  }
}

function protectedHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function proxy(request: NextRequest) {
  const expectedPassword = process.env.ANALYTICS_ADMIN_PASSWORD;
  if (!expectedPassword) {
    return protectedHeaders(
      new NextResponse("Admin dashboard is not configured", { status: 503 })
    );
  }

  const credentials = basicCredentials(request);
  const authenticated = credentials
    ? (await safeEqual(credentials[0], ADMIN_USERNAME)) &&
      (await safeEqual(credentials[1], expectedPassword))
    : false;

  if (!authenticated) {
    return protectedHeaders(
      new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Hinomarche Analytics"' },
      })
    );
  }

  return protectedHeaders(NextResponse.next());
}

export const config = {
  matcher: "/admin/:path*",
};
