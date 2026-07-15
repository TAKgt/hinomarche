export const PRODUCT_SURFACES = [
  "home",
  "category",
  "feature",
  "region",
  "related",
  "search",
  "popular",
  "recommended",
  "product",
] as const;

export type ProductSurface = (typeof PRODUCT_SURFACES)[number];

export type ProductPlacement = {
  surface: ProductSurface;
  surfaceKey: string | null;
  position: number;
};

const SURFACE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function parseProductPlacement(
  values: Pick<URLSearchParams, "get">,
): ProductPlacement | null {
  const surface = values.get("surface");
  const surfaceKey = values.get("context");
  const rawPosition = values.get("position");
  const position = Number(rawPosition);

  if (!PRODUCT_SURFACES.includes(surface as ProductSurface)) return null;
  if (surfaceKey && !SURFACE_KEY_PATTERN.test(surfaceKey)) return null;
  if (!Number.isInteger(position) || position < 1 || position > 100) return null;

  return {
    surface: surface as ProductSurface,
    surfaceKey: surfaceKey || null,
    position,
  };
}

export function isImpressionPlacement(
  placement: ProductPlacement,
): boolean {
  if (placement.surface === "product") return false;
  if (["home", "search", "popular", "recommended"].includes(placement.surface)) {
    return placement.surfaceKey === null;
  }
  return placement.surfaceKey !== null;
}

export function productPlacementQuery(placement: ProductPlacement): string {
  const params = new URLSearchParams({
    surface: placement.surface,
    position: String(placement.position),
  });
  if (placement.surfaceKey) params.set("context", placement.surfaceKey);
  return params.toString();
}
