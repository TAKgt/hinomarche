export function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hinomarche.com";
  const url = new URL(raw);
  if (url.hostname === "hinomarche.com") {
    url.hostname = "www.hinomarche.com";
  }
  return url;
}

export function siteOrigin(): string {
  return siteUrl().origin;
}
