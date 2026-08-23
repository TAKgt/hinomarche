export const PRODUCT_SURFACES = [
  "home",
  "category",
  "feature",
  "region",
  "related",
  "search",
  "popular",
  "recommended",
  "deals",
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
  if (["home", "search", "popular", "recommended", "deals"].includes(placement.surface)) {
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

export function productPlacementFragment(placement: ProductPlacement): string {
  return `#${productPlacementQuery(placement)}`;
}

const PRODUCT_PLACEMENT_KEYS = ["surface", "context", "position"] as const;

function hasProductPlacementParams(params: URLSearchParams): boolean {
  return PRODUCT_PLACEMENT_KEYS.some((key) => params.has(key));
}

export function resolveProductPlacementLocation({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}): {
  placement: ProductPlacement | null;
  cleanHref: string | null;
} {
  const queryParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const queryHasPlacement = hasProductPlacementParams(queryParams);
  const hashHasPlacement = hasProductPlacementParams(hashParams);
  const parsedPlacement =
    (hashHasPlacement ? parseProductPlacement(hashParams) : null) ??
    (queryHasPlacement ? parseProductPlacement(queryParams) : null);
  const placement =
    parsedPlacement && isImpressionPlacement(parsedPlacement)
      ? parsedPlacement
      : null;

  if (!queryHasPlacement && !hashHasPlacement) {
    return { placement, cleanHref: null };
  }

  for (const key of PRODUCT_PLACEMENT_KEYS) queryParams.delete(key);
  const cleanQuery = queryParams.toString();
  const cleanHash = hashHasPlacement ? "" : hash;

  return {
    placement,
    cleanHref: `${pathname}${cleanQuery ? `?${cleanQuery}` : ""}${cleanHash}`,
  };
}
