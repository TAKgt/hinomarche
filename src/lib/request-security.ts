const BOT_PATTERN =
  /(bot|crawler|spider|slurp|preview|facebookexternalhit|headless|lighthouse)/i;

/**
 * 同一サイトからの通常のブラウザ操作かどうかを判定する。
 * ヘッダーは偽装できるため認証には使わず、集計ノイズ抑制にだけ使う。
 */
export function isSameOriginBrowserRequest(request: Request): boolean {
  const requestHost = request.headers.get("host");
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!requestHost || !source) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    const sourceUrl = new URL(source);
    if (sourceUrl.host.toLowerCase() !== requestHost.toLowerCase()) return false;

    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedProto && sourceUrl.protocol !== `${forwardedProto}:`) return false;
  } catch {
    return false;
  }

  return !BOT_PATTERN.test(request.headers.get("user-agent") ?? "");
}
