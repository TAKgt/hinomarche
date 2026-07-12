import { NextResponse } from "next/server";
import { saveContactMessage } from "@/lib/db";

export const runtime = "nodejs";

const TOPICS = new Set(["correction", "removal", "feedback", "other"]);

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").trim().slice(0, maxLength);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const trap = cleanString(record.company, 120);
  if (trap) {
    return NextResponse.json({ ok: true });
  }

  const name = cleanString(record.name, 80);
  const email = cleanString(record.email, 254);
  const topic = cleanString(record.topic, 40);
  const message = cleanString(record.message, 3000);
  const pageUrl = cleanString(record.pageUrl, 500);

  if (!TOPICS.has(topic) || message.length < 10) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (email && !isEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    await saveContactMessage({
      name: name || null,
      email: email || null,
      topic,
      message,
      pageUrl: pageUrl || null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("contact form failed", error);
    return NextResponse.json({ error: "form_unavailable" }, { status: 503 });
  }
}
