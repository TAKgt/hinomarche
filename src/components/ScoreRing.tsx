/**
 * 日の丸モチーフの円形スコアバッジ。「AI日本度判定」のスコアを表示する。
 * 全面塗りつぶしの円で、色はスコア帯で切り替える:
 *   赤(日の丸) = 90%以上 / オレンジ = 50〜89% / 黄 = 〜49%
 * 文字色は背景色ごとにコントラストを確保(赤・オレンジ=白 / 黄=墨)。
 * サイトの目玉表示なので、必ずAI判定である旨の文言とセットで使うこと(景表法対応)。
 */

const BANDS = {
  red: { fill: "#bc002d", text: "#ffffff", sub: "rgba(255,255,255,0.85)" },
  orange: { fill: "#b85700", text: "#ffffff", sub: "#ffffff" },
  yellow: { fill: "#e8c04a", text: "#221f1a", sub: "rgba(34,31,26,0.7)" },
} as const;

function bandOf(score: number) {
  if (score >= 90) return BANDS.red;
  if (score >= 50) return BANDS.orange;
  return BANDS.yellow;
}

export function ScoreRing({
  score,
  size = 72,
}: {
  score: number;
  size?: number;
}) {
  const band = bandOf(score);

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: band.fill,
        boxShadow: `0 2px 8px ${band.fill}55`,
      }}
      role="img"
      aria-label={`AI日本度判定 ${score}パーセント`}
    >
      <span className="flex flex-col items-center justify-center leading-none">
        <span
          className="font-mincho font-semibold"
          style={{ fontSize: size * 0.32, color: band.text }}
        >
          {score}
        </span>
        <span style={{ fontSize: size * 0.13, color: band.sub }}>%</span>
      </span>
    </div>
  );
}
