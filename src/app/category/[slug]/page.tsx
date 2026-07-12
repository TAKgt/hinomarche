import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getPublishedProducts, type SortKey } from "@/lib/db";
import type { Tier } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "注目順" },
  { key: "score", label: "日本度順" },
  { key: "new", label: "新着順" },
  { key: "price_asc", label: "価格が安い順" },
  { key: "price_desc", label: "価格が高い順" },
];

const TIERS: { key: Tier | undefined; label: string }[] = [
  { key: undefined, label: "すべて" },
  { key: "high", label: "日本度 高 (80%〜)" },
  { key: "mid", label: "中 (50〜79%)" },
  { key: "low", label: "低 (〜49%)" },
];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; tier?: string }>;
};

function buildQuery(sort: SortKey, tier: Tier | undefined): string {
  const params = new URLSearchParams();
  if (sort !== "featured") params.set("sort", sort);
  if (tier) params.set("tier", tier);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return {};
  return {
    title: `${category.name}の日本製・日本産地アイテム`,
    description: `${category.name}カテゴリの商品一覧。AI日本度判定のスコアと根拠つきで紹介します。`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort: sortParam, tier: tierParam } = await searchParams;
  const sort: SortKey = SORTS.some((s) => s.key === sortParam)
    ? (sortParam as SortKey)
    : "featured";
  const tier: Tier | undefined = ["high", "mid", "low"].includes(tierParam ?? "")
    ? (tierParam as Tier)
    : undefined;

  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const products = await getPublishedProducts({ categorySlug: slug, sort, tier });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex items-start gap-6">
        <span
          aria-hidden
          className="hidden md:block tategaki font-mincho text-sumi-soft/50 text-sm pt-1"
        >
          にっぽんのもの
        </span>
        <div>
          <p className="text-xs tracking-[0.35em] text-hinomaru font-medium uppercase">
            Category
          </p>
          <h1 className="mt-2 font-mincho text-3xl md:text-4xl font-semibold">
            {category.name}
          </h1>
          <p className="mt-3 text-sm text-sumi-soft max-w-2xl leading-relaxed">
            すべての商品にAI日本度判定(スコアと根拠)を表示しています。
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4 md:space-y-3 border-b border-line pb-4">
        <div className="md:flex md:items-center md:gap-2">
          <span className="block md:w-16 text-xs text-sumi-soft mb-1.5 md:mb-0">
            並び順
          </span>
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 pb-1 md:pb-0">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={`/category/${slug}${buildQuery(s.key, tier)}`}
                className={`shrink-0 whitespace-nowrap px-4 py-1.5 text-sm border transition-colors ${
                  sort === s.key
                    ? "bg-sumi text-washi border-sumi"
                    : "border-line text-sumi-soft hover:border-sumi hover:text-sumi"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="md:flex md:items-center md:gap-2">
          <span className="block md:w-16 text-xs text-sumi-soft mb-1.5 md:mb-0">
            日本度
          </span>
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 pb-1 md:pb-0">
            {TIERS.map((t) => (
              <Link
                key={t.key ?? "all"}
                href={`/category/${slug}${buildQuery(sort, t.key)}`}
                className={`shrink-0 whitespace-nowrap px-4 py-1.5 text-sm border transition-colors ${
                  tier === t.key
                    ? "bg-hinomaru text-white border-hinomaru"
                    : "border-line text-sumi-soft hover:border-hinomaru hover:text-hinomaru"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="py-20 text-center text-sumi-soft">
          このカテゴリの商品はまだ掲載されていません。
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
