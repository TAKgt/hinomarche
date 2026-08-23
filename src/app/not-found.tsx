import Link from "next/link";
import { ProductSearchForm } from "@/components/ProductSearchForm";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-24">
      <span aria-hidden className="inline-block size-14 rounded-full bg-hinomaru/20" />
      <h1 className="mt-6 font-mincho text-3xl font-semibold">
        ページが見つかりません
      </h1>
      <p className="mt-4 text-sm text-sumi-soft leading-relaxed">
        お探しの商品は掲載を終了したか、URLが変更された可能性があります。
      </p>

      <section
        data-not-found-search=""
        className="mx-auto mt-8 max-w-xl text-left"
        aria-labelledby="not-found-search-heading"
      >
        <h2 id="not-found-search-heading" className="mb-3 text-sm font-medium text-sumi">
          商品名やブランドから探す
        </h2>
        <ProductSearchForm />
      </section>

      <nav
        data-not-found-recovery=""
        className="mx-auto mt-8 max-w-xl"
        aria-label="ページが見つからないときの案内"
      >
        <p className="text-left text-sm font-medium text-sumi">別の入口から探す</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: "/#categories", label: "ジャンルから探す" },
            { href: "/feature", label: "特集から探す" },
            { href: "/popular", label: "人気商品を見る" },
            { href: "/region", label: "産地から探す" },
            { href: "/", label: "トップへ戻る" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-12 items-center justify-center border border-line bg-white/55 px-3 py-2 text-sm text-sumi transition-colors hover:border-hinomaru hover:text-hinomaru focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
