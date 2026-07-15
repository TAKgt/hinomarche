"use client";

import { useEffect, useRef } from "react";
import type { ProductPlacement } from "@/lib/product-metrics";

type Impression = ProductPlacement & { productId: string };

const seen = new Set<string>();
let queue: Impression[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushQueue() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  if (queue.length === 0) return;

  const impressions = queue.slice(0, 20);
  queue = queue.slice(20);
  void fetch("/api/metrics/product-impression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ impressions }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);

  if (queue.length > 0) flushTimer = setTimeout(flushQueue, 500);
}

function enqueue(impression: Impression) {
  const key = `${impression.surface}:${impression.surfaceKey ?? ""}:${impression.productId}`;
  if (seen.has(key)) return;
  seen.add(key);
  queue.push(impression);

  if (queue.length >= 20) flushQueue();
  else if (!flushTimer) flushTimer = setTimeout(flushQueue, 800);
}

export function ProductImpression({
  productId,
  placement,
}: {
  productId: string;
  placement: ProductPlacement;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = markerRef.current?.closest("article");
    if (!card || typeof IntersectionObserver === "undefined") return;

    let visibleTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!visibleTimer) {
            visibleTimer = setTimeout(() => {
              enqueue({ productId, ...placement });
              observer.disconnect();
            }, 600);
          }
        } else if (visibleTimer) {
          clearTimeout(visibleTimer);
          visibleTimer = null;
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(card);

    return () => {
      if (visibleTimer) clearTimeout(visibleTimer);
      observer.disconnect();
    };
  }, [placement, productId]);

  return <span ref={markerRef} className="sr-only" aria-hidden />;
}
