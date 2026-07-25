import assert from "node:assert/strict";
import test from "node:test";
import {
  detectJudgmentConsistencyIssues,
  detectSourceConsistencyIssues,
  judgmentInputHash,
  planProductRefresh,
  refreshedProductFields,
  type ProductFreshnessSnapshot,
} from "./product-freshness";
import type { Judgment, RawProduct } from "./types";

const fetchedAt = "2026-07-25T01:02:03.000Z";

function raw(overrides: Partial<RawProduct> = {}): RawProduct {
  return {
    source: "amazon",
    sourceItemId: "item-1",
    title: "国産ひのきの椅子",
    description: "日本製。高さ42cm",
    maker: "日の丸工房",
    brand: "ヒノキ印",
    imageUrl: "https://example.com/old.jpg",
    price: 12000,
    affiliateUrl: "https://example.com/old",
    itemUrl: "https://example.com/item",
    categorySlug: "furniture",
    reviewCount: 10,
    reviewAverage: 4.5,
    affiliateRate: 2,
    searchRank: 1,
    ...overrides,
  };
}

function snapshot(product: RawProduct): ProductFreshnessSnapshot {
  return {
    source: product.source,
    title: product.title,
    description: product.description,
    maker: product.maker,
    brand: product.brand,
    judgmentInputHash: judgmentInputHash(product),
    contentUpdatedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    isPublished: true,
    judgmentStatus: "current",
  };
}

function judgment(overrides: Partial<Judgment> = {}): Judgment {
  return {
    score: 90,
    tier: "high",
    evidenceType: "産地表記",
    evidenceText: "日本製、高さ42cm",
    checks: { origin: "yes", company: "unknown", material: "unknown" },
    confidence: "high",
    model: "test",
    ...overrides,
  };
}

test("正常更新: 価格・画像等だけの更新は判定を維持する", () => {
  const before = raw();
  const after = raw({
    imageUrl: "https://example.com/new.jpg",
    price: 11000,
    affiliateUrl: "https://example.com/new",
    reviewCount: 12,
  });
  const plan = planProductRefresh(snapshot(before), after, fetchedAt);

  assert.equal(plan.inputChanged, false);
  assert.equal(plan.isPublished, true);
  assert.equal(plan.judgmentStatus, "current");
  assert.equal(plan.contentUpdatedAt, "2026-07-01T00:00:00.000Z");
  assert.deepEqual(refreshedProductFields(after), {
    title: "国産ひのきの椅子",
    description: "日本製。高さ42cm",
    maker: "日の丸工房",
    brand: "ヒノキ印",
    image_url: "https://example.com/new.jpg",
    price: 11000,
    affiliate_url: "https://example.com/new",
    item_url: "https://example.com/item",
    review_count: 12,
    review_average: 4.5,
    affiliate_rate: 2,
    search_rank: 1,
  });
});

test("変更検知: title・description・maker・brandの変更は再判定待ちに戻す", () => {
  for (const changed of [
    raw({ title: "別の商品名" }),
    raw({ description: "中国製。高さ42cm" }),
    raw({ maker: "別メーカー" }),
    raw({ brand: "別ブランド" }),
  ]) {
    const plan = planProductRefresh(snapshot(raw()), changed, fetchedAt);
    assert.equal(plan.inputChanged, true);
    assert.equal(plan.isPublished, false);
    assert.equal(plan.judgmentStatus, "pending");
    assert.equal(plan.contentUpdatedAt, fetchedAt);
  }
});

test("冪等性: 空白・全角数字だけの差は同じ判定入力として扱う", () => {
  const before = raw({ description: "日本製。 高さ４２cm" });
  const after = raw({ description: " 日本製。\n高さ42cm " });
  const plan = planProductRefresh(snapshot(before), after, fetchedAt);

  assert.equal(plan.inputChanged, false);
  assert.equal(plan.judgmentInputHash, judgmentInputHash(before));
  assert.equal(plan.contentUpdatedAt, "2026-07-01T00:00:00.000Z");
});

test("矛盾検出: 入力にない年・数値は自動公開不可", () => {
  const issues = detectJudgmentConsistencyIssues(
    raw(),
    judgment({ evidenceText: "創業1920年、高さ45cmの日本製" }),
  );

  assert.deepEqual(
    new Set(issues),
    new Set(["year_not_in_source", "number_not_in_source"]),
  );
});

test("矛盾検出: 海外製の明記に対する国内製造判定は自動公開不可", () => {
  const issues = detectJudgmentConsistencyIssues(
    raw({ title: "木製の椅子", description: "生産国：中国。高さ42cm" }),
    judgment({ evidenceText: "日本製、高さ42cm" }),
  );

  assert.deepEqual(issues, ["manufacturing_origin_conflict"]);
});

test("整合性検査: 入力と一致する年・数値・海外製判定は通過する", () => {
  const issues = detectJudgmentConsistencyIssues(
    raw({
      title: "2024年モデル 木製の椅子",
      description: "生産国：中国。高さ42cm、重量450mg",
    }),
    judgment({
      evidenceText: "2024年モデル、高さ42cm、重量450mg、中国製",
      checks: { origin: "no", company: "unknown", material: "unknown" },
    }),
  );

  assert.deepEqual(issues, []);
});

test("矛盾検出: 商品情報自体に国内製造と海外製造が併記された場合も保留する", () => {
  const issues = detectJudgmentConsistencyIssues(
    raw({
      title: "日本製 木製の椅子",
      description: "生産国：中国。高さ42cm",
    }),
    judgment(),
  );

  assert.deepEqual(issues, ["manufacturing_origin_conflict"]);
});

test("矛盾検出: 特Aの連続年数が商品名・説明内で競合すればAIが既存値を採用しても保留する", () => {
  const product = raw({
    title: "14年連続「特A」受賞米",
    description: "特Aを13年連続で獲得。別の箇所では15年連続と記載。",
  });

  for (const evidenceText of [
    "特Aを13年連続で獲得",
    "特Aを15年連続で獲得",
  ]) {
    const issues = detectJudgmentConsistencyIssues(
      product,
      judgment({ evidenceText }),
    );
    assert.equal(issues.includes("conflicting_consecutive_year_claim"), true);
  }
});

test("元情報整合性: 正常な寸法・数量・価格・更新年を競合扱いしない", () => {
  const normalCases = [
    raw({ title: "タオル 40×100cm", description: "綿100%" }),
    raw({ title: "米 5kg×2袋", description: "合計10kg" }),
    raw({ title: "3〜12枚セット", description: "用途に合わせて選択" }),
    raw({
      title: "軽量チェア",
      description: "本体重量2kg、梱包重量3kg",
    }),
    raw({
      title: "特価品",
      description: "通常価格5000円、割引価格4500円",
    }),
    raw({
      title: "2024年モデル",
      description: "情報更新日：2025年1月",
    }),
  ];

  for (const product of normalCases) {
    assert.deepEqual(detectSourceConsistencyIssues(product), []);
  }
});

test("元情報整合性: 同じ明示ラベルの認定番号・モデル年・仕様値が競合すれば保留する", () => {
  const conflictingCases = [
    raw({ description: "認定番号：ABC-123／認定番号：ABC-456" }),
    raw({ description: "モデル年：2024年、モデル年：2025年" }),
    raw({ description: "内容量：500g、内容量：600g" }),
    raw({ description: "枚数：8枚、枚数：10枚" }),
    raw({ description: "寸法：40×100cm、寸法：45×100cm" }),
  ];

  for (const product of conflictingCases) {
    assert.equal(
      detectSourceConsistencyIssues(product).includes(
        "conflicting_source_claim",
      ),
      true,
    );
  }
});
