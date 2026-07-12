import type { CheckResult, JudgmentChecks } from "@/lib/types";

/**
 * AI日本度判定の内訳3要素(生産地・企業・素材)の○△✕表示。
 * ○=商品情報で確認できた / △=記載がなく不明 / ✕=海外と明記・該当せず
 */

const MARK: Record<CheckResult, { char: string; color: string; label: string }> = {
  yes: { char: "○", color: "var(--hinomaru)", label: "確認あり" },
  unknown: { char: "△", color: "var(--kin)", label: "記載なし" },
  no: { char: "✕", color: "var(--sumi-soft)", label: "海外・該当せず" },
};

const ITEMS: { key: keyof JudgmentChecks; label: string }[] = [
  { key: "origin", label: "生産地" },
  { key: "company", label: "企業" },
  { key: "material", label: "素材" },
];

/** 商品詳細ページ用(ラベル+マーク+凡例つき) */
export function CheckMarks({ checks }: { checks: JudgmentChecks }) {
  return (
    <div>
      <div className="flex gap-6">
        {ITEMS.map(({ key, label }) => {
          const mark = MARK[checks[key]];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm text-sumi-soft">{label}</span>
              <span
                className="font-mincho text-xl font-semibold leading-none"
                style={{ color: mark.color }}
                aria-label={`${label}: ${mark.label}`}
                title={mark.label}
              >
                {mark.char}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-sumi-soft">
        ○=商品情報で確認 / △=記載なし / ✕=海外・該当せず(AI判定)
      </p>
    </div>
  );
}

/** 商品カード用のコンパクト表示 */
export function CheckMarksCompact({ checks }: { checks: JudgmentChecks }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-sumi-soft">
      {ITEMS.map(({ key, label }) => {
        const mark = MARK[checks[key]];
        return (
          <span key={key} className="inline-flex items-center gap-0.5 whitespace-nowrap">
            {label}
            <span style={{ color: mark.color }} className="font-semibold">
              {mark.char}
            </span>
          </span>
        );
      })}
    </span>
  );
}
