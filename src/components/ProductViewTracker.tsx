"use client";

import { useEffect } from "react";
import { resolveProductPlacementLocation } from "@/lib/product-metrics";

export function ProductViewTracker({
  productId,
}: {
  productId: string;
}) {
  useEffect(() => {
    const { placement, cleanHref } = resolveProductPlacementLocation({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });

    const metricRequest = fetch("/api/metrics/product-view", {
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
    });

    if (cleanHref) {
      window.history.replaceState(window.history.state, "", cleanHref);
    }

    metricRequest.catch(() => {
      // 計測失敗で商品閲覧を妨げない。
    });
  }, [productId]);

  return null;
}
