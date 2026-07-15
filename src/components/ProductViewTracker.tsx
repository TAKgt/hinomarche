"use client";

import { useEffect } from "react";
import type { ProductPlacement } from "@/lib/product-metrics";

export function ProductViewTracker({
  productId,
  placement,
}: {
  productId: string;
  placement: ProductPlacement | null;
}) {
  const surface = placement?.surface ?? null;
  const surfaceKey = placement?.surfaceKey ?? null;
  const position = placement?.position ?? null;

  useEffect(() => {
    fetch("/api/metrics/product-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, surface, surfaceKey, position }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // 計測失敗で商品閲覧を妨げない。
    });
  }, [position, productId, surface, surfaceKey]);

  return null;
}
