import Link from "next/link";
import { getCategories, getTopProducts } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice } from "@/lib/format";

export const revalidate = 3600;

export default async function Home() {
  const [products, categories] = await Promise.all([
    getTopProducts(12),
    getCategories(),
  ]);
  const heroProduct = products[0];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="relative mx-auto max-w-6xl px-5 py-14 md:min-h-[430px] md:py-20">
          <div className="relative z-10 md:w-[54%] md:pt-8">
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

          {heroProduct && (
            <Link
              href={`/product/${heroProduct.id}`}
              className="group mt-10 grid grid-cols-[7rem_1fr] items-center gap-4 border-t border-line pt-5 md:absolute md:inset-y-8 md:right-5 md:mt-0 md:block md:w-[40%] md:border-l md:border-t-0 md:pl-10 md:pt-0"
            >
              <div className="relative aspect-square overflow-hidden bg-white/45 md:h-[240px] md:w-full">
                {heroProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 外部モール画像はドメインが多岐に渡るためimgで表示
                  <img
                    src={heroProduct.imageUrl}
                    alt={heroProduct.title}
                    fetchPriority="high"
                    className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center p-5 font-mincho text-sm text-sumi-soft">
                    {heroProduct.title.slice(0, 14)}
                  </div>
                )}
              </div>
              <div className="min-w-0 md:mt-4">
                <p className="text-xs font-medium tracking-[0.25em] text-hinomaru">
                  今月の注目
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed transition-colors group-hover:text-hinomaru-deep md:text-base">
                  {heroProduct.title}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <p className="font-mincho text-lg font-semibold">
                    {formatPrice(heroProduct.price)}
                  </p>
                  <p className="text-xs text-sumi-soft">
                    AI日本度 <strong className="text-sumi">{heroProduct.score}%</strong>
                  </p>
                </div>
              </div>
            </Link>
          )}
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
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* カテゴリ */}
      <section id="categories" className="scroll-mt-24 border-t border-line bg-washi-deep/50">
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
