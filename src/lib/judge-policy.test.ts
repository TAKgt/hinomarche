import assert from "node:assert/strict";
import test from "node:test";
import {
  applyJudgmentPolicy,
  hasExplicitJapaneseMaterialOrigin,
  SYSTEM_PROMPT,
  type RawJudgmentOutput,
} from "./judge-policy";
import type { RawProduct } from "./types";

function product(overrides: Partial<RawProduct> = {}): RawProduct {
  return {
    source: "rakuten",
    sourceItemId: "test-1",
    title: "テスト商品",
    description: null,
    maker: null,
    brand: null,
    imageUrl: null,
    price: 1000,
    affiliateUrl: "https://example.com/affiliate",
    itemUrl: "https://example.com/item",
    categorySlug: "kitchen",
    ...overrides,
  };
}

function judgment(overrides: Partial<RawJudgmentOutput> = {}): RawJudgmentOutput {
  return {
    score: 90,
    evidence_type: "産地表記",
    evidence_text: "商品情報に日本製の記載",
    confidence: "high",
    checks: { origin: "yes", company: "unknown", material: "yes" },
    ...overrides,
  };
}

test("プロンプトにフェーズ2の保守的な判定規則を含む", () => {
  assert.match(SYSTEM_PROMPT, /素材産地の記載なし → unknown/);
  assert.match(SYSTEM_PROMPT, /商品の製造地だけを根拠にyesにしない/);
  assert.match(SYSTEM_PROMPT, /入力にない企業史、認定・受賞、性能、素材産地、製造地/);
  assert.match(SYSTEM_PROMPT, /「確実」「完全」「証明」/);
  assert.match(SYSTEM_PROMPT, /根拠を2〜3点に絞って/);
});

test("商品の日本製表記だけでは素材産地を確認済みにしない", () => {
  const raw = product({
    title: "日本製フライパン",
    description: "素材はアルミニウムです",
  });
  assert.equal(hasExplicitJapaneseMaterialOrigin(raw), false);
  assert.equal(applyJudgmentPolicy(raw, judgment()).checks.material, "unknown");
});

test("素材そのものの日本由来が明記されていればmaterial=yesを維持する", () => {
  for (const description of [
    "素材には国産の檜を使用",
    "北海道産小麦を使用",
    "吉野杉の木材を使用",
    "日本製の刃物鋼を使用",
  ]) {
    const raw = product({ description });
    assert.equal(hasExplicitJapaneseMaterialOrigin(raw), true, description);
    assert.equal(applyJudgmentPolicy(raw, judgment()).checks.material, "yes", description);
  }
});

test("海外産素材の記載を日本由来と誤認しない", () => {
  for (const description of ["中国産の綿を使用", "韓国産の生地を使用", "外国産の小麦を使用"]) {
    const raw = product({ description });
    assert.equal(hasExplicitJapaneseMaterialOrigin(raw), false, description);
  }
});

test("断定語を含む根拠は保存対象にしない", () => {
  const raw = product({ description: "日本製との記載" });
  assert.throws(
    () => applyJudgmentPolicy(raw, judgment({ evidence_text: "日本製であることを確実に証明" })),
    /断定語/,
  );
});

test("根拠文の前後空白を除去する", () => {
  const raw = product({ description: "素材には国産の檜を使用" });
  const result = applyJudgmentPolicy(raw, judgment({ evidence_text: "  国産檜の使用記載  " }));
  assert.equal(result.evidence_text, "国産檜の使用記載");
});
