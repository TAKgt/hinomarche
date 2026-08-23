import assert from "node:assert/strict";
import test from "node:test";
import { splitCategoryPurposeFeatures } from "./category-purpose-navigation";
import { getCommercialTopicsForCategory } from "./commercial-topics";
import { FEATURES } from "./features";

test("専用導線がないカテゴリでは既存特集2件を用途の入口へ昇格する", () => {
  const features = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
  const result = splitCategoryPurposeFeatures(false, features);

  assert.deepEqual(result.purposeFeatures, [{ slug: "a" }, { slug: "b" }]);
  assert.deepEqual(result.supplementalFeatures, [{ slug: "c" }]);
  assert.deepEqual(features, [{ slug: "a" }, { slug: "b" }, { slug: "c" }]);
});

test("既存の用途別導線があるカテゴリでは関連特集を昇格しない", () => {
  const features = [{ slug: "a" }, { slug: "b" }];
  const result = splitCategoryPurposeFeatures(true, features);

  assert.deepEqual(result.purposeFeatures, []);
  assert.deepEqual(result.supplementalFeatures, features);
});

test("既存特集だけで7カテゴリへ用途別導線を追加できる", () => {
  const categorySlugs = [
    ...new Set(FEATURES.flatMap((feature) => feature.categorySlugs)),
  ];
  const fallbackCategories = categorySlugs.filter(
    (slug) => getCommercialTopicsForCategory(slug).length === 0,
  );

  assert.equal(fallbackCategories.length, 7);
  for (const slug of fallbackCategories) {
    const related = FEATURES.filter((feature) =>
      feature.categorySlugs.includes(slug),
    );
    assert.equal(
      splitCategoryPurposeFeatures(false, related).purposeFeatures.length > 0,
      true,
    );
  }
});
