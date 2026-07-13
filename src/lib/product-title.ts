const PROMOTION_MARKERS =
  /(楽天|ranking|ランキング|送料無料|送料込|ポイント|クーポン|off|セール|sale|特価|お値打ち|マラソン|特典|ラッピング|キャンペーン|最大\s*\d+\s*%|注目商品)/i;

const PROMOTIONAL_BLOCK = /【([^】]+)】|≪([^≫]+)≫|＼([^／]+)／|\[([^\]]+)\]/g;

const LEADING_BLOCK = /^(?:【([^】]+)】|≪([^≫]+)≫|＼([^／]+)／|\[([^\]]+)\])\s*/;

/**
 * モール由来の期限付き販促文を表示上の商品名から外す。
 * DBの原文と販売先URLは変更しない。
 */
export function displayProductTitle(title: string, maxLength = 64): string {
  let cleaned = title
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[◎○●★☆♪♫※・ー\s]+/, "")
    .replace(/^(?:注目商品|目玉商品)[!！★☆\s]*/i, "")
    .trim();

  for (;;) {
    const match = cleaned.match(LEADING_BLOCK);
    if (!match) break;
    const blockText = match.slice(1).find(Boolean) ?? "";
    if (!PROMOTION_MARKERS.test(blockText)) break;
    cleaned = cleaned.slice(match[0].length).trim();
  }

  cleaned = cleaned
    .replace(PROMOTIONAL_BLOCK, (block, ...groups: Array<string | undefined>) => {
      const blockText = groups.slice(0, 4).find(Boolean) ?? "";
      return PROMOTION_MARKERS.test(blockText) ? " " : block;
    })
    .replace(/\s*(?:楽天(?:市場)?(?:ランキング)?\s*1位(?:獲得)?|ポイント\s*\d+倍|送料無料(?:\s*\([^)]*\))?)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*[/|｜]\s*$/, "")
    .trim();

  cleaned = cleaned.replace(/^[◎○●★☆♪♫※・ー\s]+/, "").trim();

  if (!cleaned) cleaned = title.trim();
  if (cleaned.length <= maxLength) return cleaned;

  const candidate = cleaned.slice(0, maxLength + 1);
  const breakAt = Math.max(
    candidate.lastIndexOf(" "),
    candidate.lastIndexOf("、"),
    candidate.lastIndexOf("/"),
  );
  const end = breakAt >= Math.floor(maxLength * 0.65) ? breakAt : maxLength;
  return `${candidate.slice(0, end).trim()}…`;
}
