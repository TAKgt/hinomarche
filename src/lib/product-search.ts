const MAX_QUERY_LENGTH = 48;
const MAX_TERMS = 5;

function cleanSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\p{N}ー-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeProductSearch(value: string | undefined): {
  query: string;
  terms: string[];
} {
  const query = Array.from(cleanSearchText(value ?? ""))
    .slice(0, MAX_QUERY_LENGTH)
    .join("")
    .trim();
  const terms = query.split(" ").filter(Boolean).slice(0, MAX_TERMS);
  return { query: terms.join(" "), terms };
}

export function matchesProductSearch(
  product: { title: string; brand: string | null; maker: string | null },
  terms: string[],
): boolean {
  const searchable = cleanSearchText(
    [product.title, product.brand, product.maker].filter(Boolean).join(" "),
  ).toLocaleLowerCase("ja-JP");
  return terms.every((term) => searchable.includes(term.toLocaleLowerCase("ja-JP")));
}
