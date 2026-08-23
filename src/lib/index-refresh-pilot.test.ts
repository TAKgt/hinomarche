import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIndexRefreshPilotUpdatePayload,
  defaultIndexRefreshPilotScope,
  executeIndexRefreshApprovalToken,
  externalPreviewApprovalToken,
  planIndexRefreshPilot,
  validateIndexRefreshPilotScope,
} from "./index-refresh-pilot";
import type { ProductPageData, RawProduct } from "./types";

const NOW = new Date("2026-08-23T00:00:00.000Z");

function raw(
  sourceItemId: string,
  overrides: Partial<RawProduct> = {},
): RawProduct {
  return {
    source: "rakuten",
    sourceItemId,
    title: "燕三条表記の調理器具",
    description: "販売元の商品説明",
    maker: null,
    brand: null,
    imageUrl: null,
    price: 3000,
    affiliateUrl: "https://item.rakuten.co.jp/example/item/",
    itemUrl: "https://item.rakuten.co.jp/example/item/",
    categorySlug: "kitchen",
    reviewCount: 10,
    reviewAverage: 4.5,
    affiliateRate: 1,
    postageIncluded: true,
    saleStartAt: null,
    saleEndAt: null,
    pointRate: null,
    pointRateStartAt: null,
    pointRateEndAt: null,
    searchRank: 1,
    ...overrides,
  };
}

function product(
  id: string,
  sourceItemId: string,
  overrides: Partial<ProductPageData> = {},
): ProductPageData {
  const source = raw(sourceItemId);
  return {
    id,
    source: source.source,
    sourceItemId,
    title: source.title,
    description: source.description,
    maker: source.maker,
    brand: source.brand,
    imageUrl: source.imageUrl,
    price: source.price,
    fetchedAt: "2026-06-01T00:00:00.000Z",
    contentUpdatedAt: "2026-06-01T00:00:00.000Z",
    priceUpdatedAt: "2026-06-01T00:00:00.000Z",
    affiliateUrl: source.affiliateUrl,
    categorySlug: source.categorySlug,
    reviewCount: source.reviewCount ?? null,
    reviewAverage: source.reviewAverage ?? null,
    affiliateRate: source.affiliateRate ?? null,
    searchRank: 1,
    demandScore: 50,
    featuredScore: 70,
    isPublished: true,
    judgmentStatus: "current",
    judgmentInputHash: null,
    score: 85,
    tier: "high",
    evidenceType: "推定",
    evidenceText: "商品情報に地域名の記載があります。",
    judgedAt: "2026-08-01T00:00:00.000Z",
    judgmentInputHashAtJudgment: null,
    consistencyStatus: "passed",
    consistencyIssues: [],
    checks: { origin: "unknown", company: "yes", material: "unknown" },
    ...overrides,
  };
}

test("初回pilotは1カテゴリ・1検索語・最大30件に固定する", () => {
  const scope = defaultIndexRefreshPilotScope();
  assert.doesNotThrow(() => validateIndexRefreshPilotScope(scope));
  assert.throws(
    () => validateIndexRefreshPilotScope({ ...scope, categorySlug: "tableware" }),
    /1件に固定/,
  );
  assert.throws(
    () => validateIndexRefreshPilotScope({ ...scope, keyword: "別の検索語" }),
    /1件に固定/,
  );
  assert.throws(
    () => validateIndexRefreshPilotScope({ ...scope, limit: 31 }),
    /1〜30件/,
  );
});

test("既存公開商品だけを再確認候補にし、復帰・入力変更・AI候補を匿名集計する", () => {
  const unchanged = product("existing-unchanged", "item-unchanged");
  const changed = product("existing-changed", "item-changed", {
    fetchedAt: "2026-08-20T00:00:00.000Z",
    priceUpdatedAt: "2026-08-20T00:00:00.000Z",
  });
  const unpublished = product("existing-unpublished", "item-unpublished", {
    isPublished: false,
    judgmentStatus: "pending",
    score: null,
    tier: null,
    evidenceType: null,
    evidenceText: null,
    judgedAt: null,
    consistencyStatus: null,
    checks: null,
  });
  const outOfScope = product("existing-outside", "item-outside", {
    categorySlug: "tableware",
  });
  const fetched = [
    raw("item-unchanged"),
    raw("item-changed", { title: "判定入力が変わった調理器具" }),
    raw("item-unpublished"),
    raw("item-outside"),
    raw("item-new"),
  ];

  const plan = planIndexRefreshPilot(
    [unchanged, changed, unpublished, outOfScope],
    fetched,
    NOW,
  );

  assert.deepEqual(plan.summary, {
    apiResults: 5,
    apiDuplicateRows: 0,
    existingMatches: 4,
    existingPublishedMatches: 2,
    existingUnpublishedMatches: 1,
    newCandidates: 1,
    outOfScopeExistingMatches: 1,
    reconfirmationSuccesses: 2,
    unchangedInputs: 1,
    inputChanges: 1,
    aiRejudgmentCandidates: 1,
    technicalRecoveryCandidates: 1,
    technicalStillExcluded: 1,
    ignoredWithoutCurrentPublicationEvidence: 3,
    writeCandidates: 2,
    productInsertsPlanned: 0,
    productDeletesPlanned: 0,
    aiCallsPlanned: 0,
    rankingFieldUpdatesPlanned: 0,
    shadowRankingUpdatesPlanned: 0,
  });
  assert.equal(plan.updates.length, 2);
  assert.equal(plan.resultFingerprint.length, 24);
  assert.doesNotMatch(
    JSON.stringify({
      scope: plan.scope,
      summary: plan.summary,
      resultFingerprint: plan.resultFingerprint,
    }),
    /existing-unchanged|item-unchanged|item-new|item\.rakuten/,
  );
});

test("書き込みpayloadは順位・カテゴリ・shadowを変更しない", () => {
  const existing = product("existing", "item");
  const unchangedPayload = buildIndexRefreshPilotUpdatePayload(
    existing,
    raw("item", { price: 3200 }),
    NOW,
  );
  const forbidden = [
    "category_slug",
    "search_rank",
    "demand_score",
    "featured_score",
    "ranking_snapshots",
    "source",
    "source_item_id",
  ];
  for (const key of forbidden) assert.equal(key in unchangedPayload, false);
  assert.equal(unchangedPayload.price, 3200);
  assert.equal("judgment_status" in unchangedPayload, false);
  assert.equal("is_published" in unchangedPayload, false);
  assert.equal("judgment_input_hash" in unchangedPayload, false);

  const changedPayload = buildIndexRefreshPilotUpdatePayload(
    existing,
    raw("item", { title: "更新後の販売元商品名" }),
    NOW,
  );
  assert.equal(changedPayload.judgment_status, "pending");
  assert.equal(changedPayload.is_published, false);
  assert.equal(typeof changedPayload.judgment_input_hash, "string");
  for (const key of forbidden) assert.equal(key in changedPayload, false);
});

test("外部previewと書き込みの承認トークンは対象と結果に結び付く", () => {
  const scope = defaultIndexRefreshPilotScope();
  const previewToken = externalPreviewApprovalToken(scope);
  const first = planIndexRefreshPilot(
    [product("existing", "item")],
    [raw("item")],
    NOW,
    scope,
  );
  const second = {
    ...first,
    resultFingerprint: "f".repeat(24),
  };

  assert.match(previewToken, /^INDEX_REFRESH_PREVIEW_[A-F0-9]{20}$/);
  assert.match(
    executeIndexRefreshApprovalToken(first),
    /^INDEX_REFRESH_EXECUTE_[A-F0-9]{20}$/,
  );
  assert.notEqual(
    executeIndexRefreshApprovalToken(first),
    executeIndexRefreshApprovalToken(second),
  );
});
