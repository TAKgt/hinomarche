"use client";

import { useEffect } from "react";
import {
  isImpressionPlacement,
  parseProductPlacement,
} from "@/lib/product-metrics";

export function ProductViewTracker({
  productId,
}: {
  productId: string;
}) {
  useEffect(() => {
    const parsedPlacement = parseProductPlacement(
      new URLSearchParams(window.location.search),
    );
    const placement =
      parsedPlacement && isImpressionPlacement(parsedPlacement)
        ? parsedPlacement
        : null;

    fetch("/api/metrics/product-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        surface: placement?.surface ?? null,
        surfaceKey: placement?.surfaceKey ?? null,
        position: placement?.position ?? null,
      }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // 計測失敗で商品閲覧を妨げない。
    });
  }, [productId]);

  return null;
}
