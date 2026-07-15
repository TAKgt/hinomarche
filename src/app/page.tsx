import Link from "next/link";
import { getCategories, getTopProducts } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { FEATURES } from "@/lib/features";
import { REGIONS } from "@/lib/regions";

export const revalidate = 3600;

export default async function Home() {
  const [products, categories] = await Promise.all([
    getTopProducts(12),
    getCategories(),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute -right-24 -top-40 size-[420px] rounded-full bg-hinomaru/[0.07]"
        />
        <div
          aria-hidden
          className="absolute -right-10 -top-24 size-[280px] rounded-full bg-hinomaru/[0.09]"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:py-28">
          <h1 className="rise rise-1 font-mincho text-4xl font-semibold leading-tight tracking-wide md:text-6xl">
            日本製品
            <br />
            買って応援
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl leading-relaxed text-sumi-soft">
            ヒノマルシェは、日本とのかかわりが深い商品を中心に集めたセレクトサイトです。
            AIが商品ごとの「日本度」を判定し、
            <strong className="font-medium text-sumi">その根拠まで</strong>
            表示します。
          </p>
        </div>
      </section>

      {/* 高スコア商品 */}
      <section id="featured" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.35em] text-hinomaru font-medium">
              FEATURED
            </p>
            <h2 className="mt-2 font-mincho text-2xl md:text-3xl font-semibold">
              日本度が高い注目商品
            </h2>
          </div>
          <Link
            href="/category/kitchen"
            className="text-sm text-sumi-soft hover:text-hinomaru transition-colors"
          >
            すべて見る →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} surface="home" />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white/30">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-16">
          <p className="text-xs font-medium tracking-[0.35em] text-hinomaru">
            FEATURE STORIES
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 className="font-mincho text-2xl font-semibold md:text-3xl">
              目的から探す
            </h2>
            <Link href="/feature" className="text-sm text-sumi-soft hover:text-hinomaru">
              全{FEATURES.length}特集を見る →
            </Link>
          </div>
          <div className="mt-7 grid border-t border-line md:grid-cols-3">
            {FEATURES.slice(0, 6).map((feature, index) => (
              <Link
                key={feature.slug}
                href={`/feature/${feature.slug}`}
                className={`group border-b border-line py-6 transition-colors hover:bg-white/50 md:px-6 ${
                  index % 3 < 2 ? "md:border-r" : ""
                }`}
              >
                <span className="text-xs text-hinomaru">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-2 block font-mincho text-xl font-semibold group-hover:text-hinomaru">
                  {feature.shortTitle}
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-sumi-soft">
                  {feature.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-washi-deep/35">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-16">
          <p className="text-xs font-medium tracking-[0.35em] text-hinomaru">
            CRAFT &amp; ORIGIN
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 className="font-mincho text-2xl font-semibold md:text-3xl">
              産地・工芸から探す
            </h2>
            <Link href="/region" className="text-sm text-sumi-soft hover:text-hinomaru">
              全{REGIONS.length}産地を見る →
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 border-l border-t border-line md:grid-cols-4 lg:grid-cols-7">
            {REGIONS.map((region) => (
              <Link
                key={region.slug}
                href={`/region/${region.slug}`}
                className="group border-b border-r border-line px-4 py-5 transition-colors hover:bg-white/60"
              >
                <span className="block text-xs text-sumi-soft">{region.eyebrow}</span>
                <span className="mt-1 block font-mincho text-lg font-semibold group-hover:text-hinomaru">
                  {region.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* カテゴリ */}
      <section id="categories" className="scroll-mt-24 border-t border-line bg-washi-deep/50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-mincho text-2xl font-semibold">カテゴリ</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-1 md:grid-cols-3">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="group flex min-h-12 items-center gap-3 border-b border-line/70 py-2 text-sm sm:text-base"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full bg-hinomaru transition-transform group-hover:scale-150"
                  />
                  <span className="group-hover:text-hinomaru transition-colors">
                    {c.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-sumi-soft">
            各ジャンルでも、人気とAI日本度をもとに注目商品を上位表示しています。
            <Link href="/about" className="ml-3 text-hinomaru hover:underline">
              AI日本度判定のしくみ →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
