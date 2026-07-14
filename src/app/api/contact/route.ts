import { NextResponse } from "next/server";
import { saveContactMessage } from "@/lib/db";
import { isSameOriginBrowserRequest } from "@/lib/request-security";
import { JsonRequestError, readJsonObject } from "@/lib/request-json";

export const runtime = "nodejs";

const TOPICS = new Set(["correction", "removal", "feedback", "other"]);

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").trim().slice(0, maxLength);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function sameOriginPageUrl(value: unknown, request: Request): string {
  const cleaned = cleanString(value, 500);
  if (!cleaned) return "";
  try {
    const pageUrl = new URL(cleaned);
    if (pageUrl.origin !== new URL(request.url).origin) return "";
    pageUrl.hash = "";
    return pageUrl.href;
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return json({ error: "forbidden" }, 403);
  }

  let record: Record<string, unknown>;
  try {
    record = await readJsonObject(request);
  } catch (error) {
    if (error instanceof JsonRequestError) {
      return json({ error: error.code }, error.status);
    }
    return json({ error: "invalid_request" }, 400);
  }

  const trap = cleanString(record.company, 120);
  if (trap) {
    return json({ ok: true });
  }

  const name = cleanString(record.name, 80);
  const email = cleanString(record.email, 254);
  const topic = cleanString(record.topic, 40);
  const message = cleanString(record.message, 3000);
  const pageUrl = sameOriginPageUrl(record.pageUrl, request);

  if (!TOPICS.has(topic) || message.length < 10) {
    return json({ error: "invalid_request" }, 400);
  }
  if (email && !isEmail(email)) {
    return json({ error: "invalid_email" }, 400);
  }

  try {
    await saveContactMessage({
      name: name || null,
      email: email || null,
      topic,
      message,
      pageUrl: pageUrl || null,
    });
    return json({ ok: true });
  } catch (error) {
    console.error("contact form failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return json({ error: "form_unavailable" }, 503);
  }
}
