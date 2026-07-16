import type { CheckResult, EvidenceType, RawProduct } from "./types";

export interface RawJudgmentOutput {
  score: number;
  evidence_type: EvidenceType;
  evidence_text: string;
  confidence: "high" | "mid" | "low";
  checks: { origin: CheckResult; company: CheckResult; material: CheckResult };
}

export const SYSTEM_PROMPT = `あなたは、日本とのかかわりが深い商品を紹介するECサイトの判定エンジンです。
入力された商品情報だけを根拠に、その商品の「日本関連度」を0〜100で推定します。

## 判定基準
- 80〜100(高): 「日本製」「国産」「Made in Japan」の明記、または具体的な産地・工房の記載
  (例: 今治タオル、燕三条、堺打刃物、有田焼、南部鉄器、秋田杉、美濃和紙 など)。
  産地+製造者名まで入力で確認できれば95前後、産地ブランド名のみなら85前後。
- 50〜79(中): 入力から日本のメーカー・ブランドだと確認できるが、この商品の生産国は確認できない。
  海外生産の可能性が高い日本ブランド(大量生産の家電・雑貨等)は50台にする。
- 0〜49(低): 生産国が海外と明記、海外ブランド、または日本との関連をほぼ確認できない。

## 内訳3要素チェック(checks)
総合スコアとは別に、次の3要素を個別に判定します。
- origin(生産地): この商品が日本国内で製造されているか。「日本製」「国産」や産地(燕三条等)の明記 → yes /
  生産国が海外と明記 → no / 記載なし → unknown。日本企業の商品というだけではyesにしない。
- company(企業): 日本の企業・ブランドの商品か。入力に日本企業・日本ブランドと確認できる記載 → yes /
  海外企業・海外ブランドと確認できる → no / 判別できない → unknown。日本語の商品名だけではyesにしない。
- material(素材): 主要な素材・原材料・部品の産地が日本か。入力に「国産の檜」「北海道産小麦」
  「日本製の刃物鋼」など素材そのものの日本由来が明記されている場合だけyes。海外由来の明記 → no /
  素材産地の記載なし → unknown。「日本製」「国内製造」など商品の製造地だけを根拠にyesにしない。

## evidence_textの作成規則
- 入力中に確認できる事実だけを使い、根拠を2〜3点に絞って簡潔な体言止めで書く。
- 確認できる事実が1点しかない場合は、数を合わせるために推測を足さず、その1点だけを書く。
- 入力にない企業史、認定・受賞、性能、素材産地、製造地、企業・ブランドの国籍を補わない。
- 「確実」「完全」「証明」など、保証や断定に見える語を使わない。
- 商品説明の宣伝文句(「職人品質」等)を事実として言い換えない。

## 重要な原則
- 情報不足の場合はスコアを低めに倒し、checksはunknownを使う。推測で高評価をつけない。
- 入力にある「商品自体の製造地」「企業の所在」「素材産地」を混同しない。
- evidence_textは消費者にそのまま表示される。入力にない事実は一切書かない。

## 判定例
- 「日本製フライパン。素材: アルミニウム」: origin=yes、material=unknown。
- 「日本メーカーの商品。生産国の記載なし」: company=yes、origin=unknown、material=unknown。
- 「日本製。国産檜を使用」: origin=yes、material=yes。
- 「日本ブランド。中国製」: company=yes、origin=no。素材産地の記載がなければmaterial=unknown。`;

const MATERIAL_TERM =
  "(?:素材|原材料|原料|主原料|部品|生地|繊維|綿|コットン|毛|ウール|絹|シルク|木材|杉|檜|ひのき|竹|革|レザー|鋼|鋼材|刃物鋼|鉄|陶土|粘土|米|小麦|大豆|茶葉|果実)";
const JAPANESE_ORIGIN =
  "(?:(?<![中韓米英仏外豪加独伊露])国産|日本産|国内産|日本由来|北海道産|[一-龠々ぁ-んァ-ヶー]{1,12}(?:都|道|府|県)産)";
const MATERIAL_ORIGIN_PATTERNS = [
  new RegExp(`${JAPANESE_ORIGIN}[^。\\n]{0,24}${MATERIAL_TERM}`),
  new RegExp(`${MATERIAL_TERM}[^。\\n]{0,24}${JAPANESE_ORIGIN}`),
  /(?:秋田杉|吉野杉|木曽(?:檜|ひのき)|美濃和紙|越前和紙|土佐和紙)/,
  /日本製(?:の|を使用した)?(?:刃物鋼|鋼材|部品|生地|繊維)/,
];

const FORBIDDEN_ABSOLUTE_LANGUAGE = /確実|完全|証明/;

function rawProductText(raw: RawProduct): string {
  return [raw.title, raw.description, raw.brand, raw.maker].filter(Boolean).join("\n");
}

/** 商品の製造地ではなく、素材そのものの日本由来が入力に明記されているかを保守的に確認する。 */
export function hasExplicitJapaneseMaterialOrigin(raw: RawProduct): boolean {
  const text = rawProductText(raw);
  return MATERIAL_ORIGIN_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * モデル出力の最後の安全弁。
 * 素材産地の根拠が入力に見つからないmaterial=yesはunknownへ戻し、断定語は保存しない。
 */
export function applyJudgmentPolicy(
  raw: RawProduct,
  output: RawJudgmentOutput,
): RawJudgmentOutput {
  const evidenceText = output.evidence_text.trim();
  if (!evidenceText) {
    throw new Error("判定根拠が空です");
  }
  if (FORBIDDEN_ABSOLUTE_LANGUAGE.test(evidenceText)) {
    throw new Error("判定根拠に断定語が含まれています");
  }

  return {
    ...output,
    evidence_text: evidenceText,
    checks: {
      ...output.checks,
      material:
        output.checks.material === "yes" && !hasExplicitJapaneseMaterialOrigin(raw)
          ? "unknown"
          : output.checks.material,
    },
  };
}
