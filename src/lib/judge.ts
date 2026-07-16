import Anthropic from "@anthropic-ai/sdk";
import { applyJudgmentPolicy, SYSTEM_PROMPT, type RawJudgmentOutput } from "./judge-policy";
import type { Judgment, RawProduct } from "./types";
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

  const parsed = applyJudgmentPolicy(raw, JSON.parse(block.text) as RawJudgmentOutput);

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
