import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "ヒノマルシェのプライバシーポリシーです。",
};

const sections = [
  {
    title: "基本方針",
    body: [
      "ヒノマルシェ(以下「当サイト」)は、ご利用者のプライバシーを尊重し、個人情報の保護に関する法令を遵守して、取得した情報を適切に取り扱います。",
    ],
  },
  {
    title: "取得する情報と利用目的",
    body: [
      "当サイトは、会員登録等でご利用者の個人情報を取得することはありません。お問い合わせフォームを利用された場合に限り、入力されたお名前、メールアドレス、本文等を取得し、お問い合わせへの対応のみに利用します。",
      "商品選びとサイト改善のため、商品ページの閲覧数と、どの商品からどの販売サイトへ移動したかを匿名の件数として記録します。この記録にIPアドレス、Cookie、ブラウザ識別子、氏名、メールアドレスは保存しません。",
      "取得した連絡先情報を、ご本人の同意なく第三者に提供することはありません(法令に基づく場合を除きます)。",
    ],
  },
  {
    title: "Cookie(クッキー)について",
    body: [
      "当サイトのリンクからAmazon・楽天市場等の販売サイトへ移動した場合、アフィリエイトプログラムの仕組みとして、各事業者によりCookieが使用されることがあります。Cookieにより個人が特定されることはありません。",
      "Cookieの利用を望まない場合は、ブラウザの設定によりCookieを無効にすることができます。",
    ],
  },
  {
    title: "アフィリエイトプログラムについて",
    body: [
      "当サイトは、Amazonアソシエイト・プログラム(Amazon.co.jpを宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラム)の参加者です。Amazonのアソシエイトとして、ヒノマルシェは適格販売により収入を得ています。",
      "また、もしもアフィリエイトを経由して楽天アフィリエイトに参加しています。",
    ],
  },
  {
    title: "アクセス解析について",
    body: [
      "当サイトは、サイトの利用状況を把握し改善するため、Google LLCのGoogle Analytics 4を利用しています。Google AnalyticsはCookie等を使用し、ページの閲覧状況や利用環境などのデータを収集します。これらのデータはGoogleのプライバシーポリシーと利用規約に基づいて管理されます。",
      "Google Analyticsによるデータ収集を望まない場合は、ブラウザのCookieを無効にするか、Googleが提供するGoogle Analyticsオプトアウトアドオンを利用できます。",
    ],
  },
  {
    title: "プライバシーポリシーの変更について",
    body: [
      "本ポリシーは、法令の改正やサイト運営上の必要に応じて、予告なく変更することがあります。変更後の内容は、当ページに掲載した時点から適用されます。",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs tracking-[0.35em] text-hinomaru font-medium uppercase">
        Privacy Policy
      </p>
      <h1 className="mt-2 font-mincho text-3xl md:text-4xl font-semibold">
        プライバシーポリシー
      </h1>
      <p className="mt-6 text-sm text-sumi-soft">制定日: 2026年7月11日</p>

      {sections.map((s) => (
        <section key={s.title} className="mt-10 space-y-3 leading-relaxed">
          <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
            {s.title}
          </h2>
          {s.body.map((p, i) => (
            <p key={i} className="text-sm text-sumi-soft leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}

      <p className="mt-12 text-sm">
        <Link href="/contact" className="text-hinomaru hover:underline">
          お問い合わせはこちら →
        </Link>
      </p>
    </div>
  );
}
