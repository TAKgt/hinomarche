import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeEditorialSourceUrl,
  toProductEditorialEvidence,
  validateProductEvidenceInput,
  type ProductEvidenceInput,
  type ProductEvidenceValidationContext,
} from "./product-editorial-evidence";

const HASH = "a".repeat(64);

const CURRENT_CONTEXT: ProductEvidenceValidationContext = {
  currentProductInputHash: HASH,
  productIsPublished: true,
  judgmentStatus: "current",
  latestJudgmentConsistencyPassed: true,
};

function evidence(overrides: Partial<ProductEvidenceInput> = {}): ProductEvidenceInput {
  return {
    productId: "00000000-0000-4000-8000-000000000001",
    claimType: "manufacturing_origin",
    claimText: "メーカー公式ページに製造地の記載がある",
    sourceExcerpt: "製造地に関する必要最小限の原文",
    sourceUrl: "https://manufacturer.example/products/item",
    sourceName: "メーカー公式サイト",
    sourceKind: "manufacturer",
    retrievedAt: "2026-08-09T01:00:00.000Z",
    reviewStatus: "human_source_checked",
    humanCheckedAt: "2026-08-09T02:00:00.000Z",
    productInputHash: HASH,
    evidenceHash: "b".repeat(64),
    hasIndependentComparison: true,
    isPublic: true,
    ...overrides,
  };
}

test("HTTPSの公開公式URLと完全な人手確認入力を受け付ける", () => {
  assert.equal(isSafeEditorialSourceUrl("https://manufacturer.example/item"), true);
  assert.deepEqual(validateProductEvidenceInput(evidence(), CURRENT_CONTEXT), []);
});

test("HTTP・資格情報・フラグメント・ローカル宛てURLを拒否する", () => {
  for (const url of [
    "http://manufacturer.example/item",
    "https://user:pass@manufacturer.example/item",
    "https://manufacturer.example/item#source",
    "https://localhost/item",
    "https://service.local/item",
    "https://127.0.0.1/item",
    "https://10.0.0.1/item",
    "https://172.16.0.1/item",
    "https://192.168.1.1/item",
    "https://[::1]/item",
  ]) {
    assert.equal(isSafeEditorialSourceUrl(url), false, url);
  }
});

test("人手確認済みはURL・出典名・抜粋・取得日・確認日を必須にする", () => {
  const issues = validateProductEvidenceInput(
    evidence({
      sourceUrl: null,
      sourceName: null,
      sourceExcerpt: null,
      retrievedAt: null,
      humanCheckedAt: null,
      isPublic: false,
    }),
    CURRENT_CONTEXT,
  );
  assert.equal(issues.includes("human_check_incomplete"), true);
});

test("販売元を人手確認しても一次情報として公開できない", () => {
  const issues = validateProductEvidenceInput(
    evidence({ sourceKind: "seller" }),
    CURRENT_CONTEXT,
  );
  assert.equal(issues.includes("public_source_kind_invalid"), true);
  assert.equal(toProductEditorialEvidence(evidence({ sourceKind: "seller" })).primarySourceUrl, null);
});

test("商品ハッシュ不一致・非公開・判定不整合では公開できない", () => {
  const issues = validateProductEvidenceInput(evidence(), {
    currentProductInputHash: "c".repeat(64),
    productIsPublished: false,
    judgmentStatus: "blocked",
    latestJudgmentConsistencyPassed: false,
  });
  assert.equal(issues.includes("public_product_state_invalid"), true);
  assert.equal(issues.includes("public_product_hash_mismatch"), true);
  assert.equal(issues.includes("public_judgment_not_consistent"), true);
});

test("AI推定を人手確認済みの編集根拠へ変換しない", () => {
  const converted = toProductEditorialEvidence(
    evidence({
      reviewStatus: "ai_inferred",
      humanCheckedAt: null,
      isPublic: false,
    }),
  );
  assert.deepEqual(converted, {
    primarySourceUrl: null,
    sourceExcerpt: null,
    retrievedAt: null,
    humanVerifiedAt: null,
    hasIndependentComparison: false,
  });
});

test("公式一次情報と独自比較が揃った場合だけeditorial入力へ変換する", () => {
  assert.deepEqual(toProductEditorialEvidence(evidence()), {
    primarySourceUrl: "https://manufacturer.example/products/item",
    sourceExcerpt: "製造地に関する必要最小限の原文",
    retrievedAt: "2026-08-09T01:00:00.000Z",
    humanVerifiedAt: "2026-08-09T02:00:00.000Z",
    hasIndependentComparison: true,
  });
});
