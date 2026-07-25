/**
 * Supabaseの既定上限を超える読み取り専用監査向けページャー。
 * 最終ページがちょうどpageSize件でも、次の空ページを読んで安全に終了する。
 */
export async function readAllPages<T>(
  readPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("pageSize must be a positive integer");
  }

  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await readPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
