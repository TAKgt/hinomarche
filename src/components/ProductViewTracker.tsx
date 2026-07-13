"use client";

import { useEffect } from "react";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    fetch("/api/metrics/product-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // 計測失敗で商品閲覧を妨げない。
    });
  }, [productId]);

  return null;
}
