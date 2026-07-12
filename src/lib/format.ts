export function formatPrice(price: number | null): string {
  if (price == null) return "価格情報なし";
  return `¥${price.toLocaleString("ja-JP")}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}時点`;
}

export const SOURCE_LABEL = { rakuten: "楽天市場", amazon: "Amazon" } as const;
