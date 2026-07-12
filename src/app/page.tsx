import Link from "next/link";
import { getCategories, getTopProducts } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";

export default async function Home() {
  const [products, categories] = await Promise.all([
    getTopProducts(12),
    getCategories(),
  ]);

  return (
    <div>
      {/* ヒーロー: 日の丸 */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute -right-24 -top-40 size-[420px] rounded-full bg-hinomaru/[0.07]"
        />
        <div
          aria-hidden
          className="absolute -right-10 -top-24 size-[280px] rounded-full bg-hinomaru/[0.09]"
        />
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 relative">
          <h1 className="rise rise-1 font-mincho text-4xl md:text-6xl font-semibold leading-tight tracking-wide">
            日本製品
            <br />
            買って応援
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl text-sumi-soft leading-relaxed">
            ヒノマルシェは、日本とのかかわりが深い商品を中心に集めたセレクトサイトです。
            AIが商品ごとの「日本度」を判定し、
            <strong className="text-sumi font-medium">その根拠まで</strong>
            表示します。
          </p>
        </div>
      </section>

      {/* 高スコア商品 */}
      <section className="mx-auto max-w-6xl px-5 py-16">
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
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* カテゴリ */}
      <section className="border-t border-line bg-washi-deep/50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-mincho text-2xl font-semibold">カテゴリ</h2>
          <ul className="mt-6 space-y-3">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="group flex items-center gap-3 text-lg"
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
            タオル(今治・泉州)、文具などのカテゴリも順次追加予定です。
            <Link href="/about" className="ml-3 text-hinomaru hover:underline">
              AI日本度判定のしくみ →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
