import Anthropic from "@anthropic-ai/sdk";
import type { CheckResult, EvidenceType, Judgment, RawProduct } from "./types";
import { tierOf } from "./types";

/**
 * AI日本関連度判定モジュール。
 * Claude Haiku 4.5 + 構造化出力(JSONスキーマ保証)で、商品情報から
 * score / evidence_type / evidence_text を得る。1商品あたり約0.3〜0.5円。
 */

const MODEL = process.env.JUDGE_MODEL ?? "claude-haiku-4-5";

const client = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から読む

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      description: "日本関連度 0〜100",
    },
    evidence_type: {
      type: "string",
      enum: ["産地表記", "日本メーカー", "生産国表記", "推定"],
      description: "判定根拠の種別",
    },
    evidence_text: {
      type: "string",
      description:
        "判定根拠の説明文(サイトにそのまま表示される。です・ます調ではなく簡潔な体言止めで)",
    },
    confidence: {
      type: "string",
      enum: ["high", "mid", "low"],
      description: "判定の確信度",
    },
    checks: {
      type: "object",
      description: "内訳3要素の個別チェック",
      properties: {
        origin: {
          type: "string",
          enum: ["yes", "unknown", "no"],
          description: "生産地: 日本国内で製造されているか",
        },
        company: {
          type: "string",
          enum: ["yes", "unknown", "no"],
          description: "企業: 日本の企業・ブランドの商品か",
        },
        material: {
          type: "string",
          enum: ["yes", "unknown", "no"],
          description: "素材: 主要な素材・部品が日本のものか",
        },
      },
      required: ["origin", "company", "material"],
      additionalProperties: false,
    },
  },
  required: ["score", "evidence_type", "evidence_text", "confidence", "checks"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `あなたは「日本製・日本産地の商品」を扱うECサイトの判定エンジンです。
商品情報から、その商品の「日本関連度」を0〜100で判定します。

## 判定基準
- 80〜100(高): 「日本製」「国産」「Made in Japan」の明記、または具体的な産地・工房の記載
  (例: 今治タオル、燕三条、堺打刃物、有田焼、南部鉄器、秋田杉、美濃和紙 など)。
  産地+製造者名まで確認できれば95前後、産地ブランド名のみなら85前後。
- 50〜79(中): 日本のメーカー・ブランドだが、この商品の生産国が商品情報から確認できない。
  海外生産の可能性が高い日本ブランド(大量生産の家電・雑貨等)は50台に。
- 0〜49(低): 生産国が海外と明記、海外ブランド、または日本との関連がほぼ確認できない。

## 内訳3要素チェック(checks)
総合スコアとは別に、次の3要素を個別に判定します。
- origin(生産地): 日本国内で製造されているか。「日本製」「国産」や産地(燕三条等)の明記 → yes /
  生産国が海外と明記 → no / 記載なし → unknown
- company(企業): 日本の企業・ブランドの商品か。日本メーカーと確認できる → yes /
  海外企業・海外ブランド → no / 判別できない → unknown
- material(素材): 主要な素材・部品が日本のものか。「秋田杉」「日本製の刃物鋼」など素材の産地明記 → yes /
  素材が海外産と明記 → no / 記載なし → unknown(素材産地はほとんどの商品で不明。安易にyesにしない)

## 重要な原則
- 情報不足の場合はスコアを低めに倒す。推測で高評価をつけない(景品表示法対応)。
- evidence_text は消費者がそのまま読む文章。何を根拠に判定したかを具体的に書く。
  商品情報に書かれていないことを断定しない。
- 商品説明の宣伝文句(「職人品質」等)ではなく、産地・生産国・メーカーの事実記載を根拠にする。`;

export async function judgeProduct(raw: RawProduct): Promise<Judgment> {
  const productInfo = [
    `商品名: ${raw.title}`,
    raw.brand ? `ブランド: ${raw.brand}` : null,
    raw.maker ? `メーカー: ${raw.maker}` : null,
    `販売元: ${raw.source === "rakuten" ? "楽天市場" : "Amazon"}`,
    `商品説明:\n${(raw.description ?? "(説明文なし)").slice(0, 3000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: {
      format: {
        type: "json_schema",
        schema: OUTPUT_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: `次の商品の日本関連度を判定してください。\n\n${productInfo}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error(`判定結果が取得できませんでした (stop_reason: ${response.stop_reason})`);
  }

  const parsed = JSON.parse(block.text) as {
    score: number;
    evidence_type: EvidenceType;
    evidence_text: string;
    confidence: "high" | "mid" | "low";
    checks: { origin: CheckResult; company: CheckResult; material: CheckResult };
  };

  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  return {
    score,
    tier: tierOf(score),
    evidenceType: parsed.evidence_type,
    evidenceText: parsed.evidence_text,
    checks: parsed.checks,
    confidence: parsed.confidence,
    model: MODEL,
  };
}
