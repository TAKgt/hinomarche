const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function windowFrom<T>(items: T[], requestedLimit: number, start: number): T[] {
  if (items.length <= requestedLimit) return items;

  return Array.from(
    { length: requestedLimit },
    (_, offset) => items[(start + offset) % items.length],
  );
}

function stableOffset(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function dailyWindow<T>(
  items: T[],
  requestedLimit: number,
  now = Date.now(),
): T[] {
  const day = Math.floor(now / DAY_MS);
  return windowFrom(items, requestedLimit, (day * requestedLimit) % items.length);
}

export function categoryKeywordWindow<T>(
  items: T[],
  requestedLimit: number,
  categorySlug: string,
  now = Date.now(),
): T[] {
  if (items.length === 0) return [];

  // カテゴリ巡回と検索語巡回を別周期にし、同じ検索語だけが選ばれる偏りを防ぐ。
  const week = Math.floor(now / WEEK_MS);
  const start = (week + stableOffset(categorySlug)) % items.length;
  return windowFrom(items, requestedLimit, start);
}
