import type { Metadata } from "next";
import Link from "next/link";
import { CategoryMenu } from "@/components/CategoryMenu";
import { ProductSearchForm } from "@/components/ProductSearchForm";
import { getCategories } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "ヒノマルシェ | 日本製品 買って応援",
    template: "%s | ヒノマルシェ",
  },
  description:
    "日本とのかかわりが深い商品を中心に集めたセレクトサイト。AIが商品ごとの「日本度」を判定根拠つきで表示します。",
  verification: {
    google: "VMqessd_1h9nlHgMhQSBvdfi6JneC5YtPETQ1cyxUGs",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();

  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-washi/90 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 lg:flex-nowrap lg:gap-5 lg:py-4">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <span
                aria-hidden
                className="block size-8 md:size-9 shrink-0 rounded-full bg-hinomaru shadow-[0_2px_10px_rgba(188,0,45,0.35)] transition-transform group-hover:scale-110"
              />
              <span className="font-mincho text-lg font-semibold tracking-[0.12em] whitespace-nowrap sm:text-xl md:text-2xl md:tracking-[0.18em]">
                ヒノマルシェ
              </span>
            </Link>
            <div className="order-3 w-full lg:order-none lg:ml-auto lg:w-[19rem]">
              <ProductSearchForm compact />
            </div>
            <nav className="ml-auto flex min-w-0 items-center gap-5 text-sm font-medium text-sumi-soft md:gap-7 lg:ml-0">
              <Link
                href="/#featured"
                className="hidden whitespace-nowrap transition-colors hover:text-hinomaru sm:block"
              >
                注目商品
              </Link>
              <CategoryMenu categories={categories} />
              <Link
                href="/about"
                className="hidden whitespace-nowrap transition-colors hover:text-hinomaru md:block"
              >
                このサイトについて
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-20 border-t border-line bg-sumi text-washi">
          <div className="mx-auto max-w-6xl px-5 py-10 space-y-5">
            <div className="flex items-center gap-3">
              <span aria-hidden className="block size-5 rounded-full bg-hinomaru" />
              <span className="font-mincho text-lg tracking-[0.18em]">ヒノマルシェ</span>
            </div>
            <p className="text-sm leading-relaxed text-washi/80 max-w-3xl">
              「AI日本度」はAIによる推定であり、実際の生産国・原産地を保証するものではありません。
              価格・在庫は取得時点の情報です。正確な情報は必ず各販売ページでご確認ください。
            </p>
            <p className="text-sm leading-relaxed text-washi/80 max-w-3xl">
              Amazonのアソシエイトとして、ヒノマルシェは適格販売により収入を得ています。
              当サイトは楽天アフィリエイト(もしもアフィリエイト経由)にも参加しています。
            </p>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-washi/60 pt-1">
              <Link href="/about" className="hover:text-washi transition-colors">
                このサイトについて
              </Link>
              <Link href="/disclaimer" className="hover:text-washi transition-colors">
                免責事項
              </Link>
              <Link href="/privacy" className="hover:text-washi transition-colors">
                プライバシーポリシー
              </Link>
              <Link href="/contact" className="hover:text-washi transition-colors">
                お問い合わせ
              </Link>
              <span>© {new Date().getFullYear()} hinomarche.com</span>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
