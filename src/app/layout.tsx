import type { Metadata } from "next";
import Link from "next/link";
import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";
import { getCategories } from "@/lib/db";
import "./globals.css";

function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hinomarche.com";
  const url = new URL(raw);
  if (url.hostname === "hinomarche.com") {
    url.hostname = "www.hinomarche.com";
  }
  return url;
}

const shippori = Shippori_Mincho({
  variable: "--font-shippori",
  weight: ["500", "600", "800"],
  subsets: ["latin"],
  preload: false,
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "ヒノマルシェ | 日本製品 買って応援",
    template: "%s | ヒノマルシェ",
  },
  description:
    "日本とのかかわりが深い商品を中心に集めたセレクトサイト。AIが商品ごとの「日本度」を判定根拠つきで表示します。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();

  return (
    <html
      lang="ja"
      className={`${shippori.variable} ${zenKaku.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-washi/90 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-5 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-6">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <span
                aria-hidden
                className="block size-8 md:size-9 shrink-0 rounded-full bg-hinomaru shadow-[0_2px_10px_rgba(188,0,45,0.35)] transition-transform group-hover:scale-110"
              />
              <span className="font-mincho text-xl md:text-2xl font-semibold tracking-[0.18em] whitespace-nowrap">
                ヒノマルシェ
              </span>
            </Link>
            <nav className="flex items-center gap-5 md:gap-6 text-sm font-medium text-sumi-soft overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 pb-1 md:pb-0">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="hover:text-hinomaru transition-colors whitespace-nowrap"
                >
                  {c.name}
                </Link>
              ))}
              <Link
                href="/about"
                className="hover:text-hinomaru transition-colors whitespace-nowrap"
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
