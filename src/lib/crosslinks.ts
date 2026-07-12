import { wrapMoshimoRakuten } from "./rakuten";

/**
 * 相互送客リンク: 楽天商品にはAmazon検索、Amazon商品には楽天検索へのリンクを出す。
 * 同一商品への直リンクではなく「商品名での検索結果ページ」に飛ばす
 * (API資格がなくても使える通常のアフィリエイトリンク。UI側で検索結果である旨を明示すること)。
 */

/** 商品名から検索クエリを作る(【送料無料】等の販促文言を除いて先頭の語だけ使う) */
export function searchQueryFromTitle(title: string): string {
  const cleaned = title
    .replace(/【[^】]*】/g, " ")
    .replace(/[［\[][^\]］]*[\]］]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 5).join(" ");
  return words || cleaned.slice(0, 30) || title.slice(0, 30);
}

/** Amazonの検索結果ページ(トラッキングID付き) */
export function amazonSearchUrl(title: string): string {
  const tag = process.env.AMAZON_PARTNER_TAG;
  const q = encodeURIComponent(searchQueryFromTitle(title));
  return `https://www.amazon.co.jp/s?k=${q}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
}

/** 楽天市場の検索結果ページ(もしもリンクでラップ) */
export function rakutenSearchUrl(title: string): string {
  const q = encodeURIComponent(searchQueryFromTitle(title));
  return wrapMoshimoRakuten(`https://search.rakuten.co.jp/search/mall/${q}/`);
}
