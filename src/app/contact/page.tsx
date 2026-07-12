import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "ヒノマルシェへのお問い合わせ方法のご案内です。",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs tracking-[0.35em] text-hinomaru font-medium uppercase">
        Contact
      </p>
      <h1 className="mt-2 font-mincho text-3xl md:text-4xl font-semibold">
        お問い合わせ
      </h1>

      <section className="mt-10 space-y-4 leading-relaxed">
        <p className="text-sm text-sumi-soft leading-relaxed">
          当サイトへのお問い合わせは、下記のフォームからお願いいたします。
          内容を確認のうえ、必要に応じてご返信いたします(すべてのお問い合わせへの
          返信をお約束するものではありません)。
        </p>

        <ContactForm />
      </section>

      <section className="mt-10 space-y-3 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          お問い合わせいただける内容の例
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-sumi-soft">
          <li>掲載内容の誤り(AI日本度判定の誤りを含む)のご指摘</li>
          <li>掲載商品・画像の削除のご依頼(権利者の方)</li>
          <li>当サイトに関するご意見・ご要望</li>
        </ul>
        <p className="text-sm text-sumi-soft leading-relaxed">
          ※ 商品の購入・配送・返品など取引に関するお問い合わせは、当サイトではお答え
          できません。ご購入先(Amazon・楽天市場の各販売店)へお願いいたします。
        </p>
      </section>
    </div>
  );
}
