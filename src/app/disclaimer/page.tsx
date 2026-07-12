import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "免責事項",
  description: "ヒノマルシェの免責事項です。",
};

const sections = [
  {
    title: "掲載情報について",
    body: [
      "当サイトに掲載している商品情報(商品名・説明・画像・価格など)は、Amazon・楽天市場が提供するAPIから取得したものです。当サイトは掲載情報の正確性・完全性・最新性について保証するものではありません。",
      "表示価格・在庫状況は情報取得時点のものであり、現在の販売条件と異なる場合があります。購入前に必ずリンク先の販売ページで最新の情報をご確認ください。",
    ],
  },
  {
    title: "「AI日本度」判定について",
    body: [
      "当サイトの「AI日本度」および付随する判定(生産地・企業・素材のチェックを含む)は、公開されている商品情報をAI(人工知能)が解析して推定したものです。実際の生産国・原産地・企業情報・素材を保証するものではなく、判定結果が事実と異なる場合があります。",
      "判定はあくまで商品選びの参考情報としてご利用ください。原産地等の正確な情報は、販売元または製造元にご確認ください。",
      "判定内容に誤りを発見された場合は、お問い合わせよりご連絡いただけますと幸いです。確認のうえ、修正または掲載停止の対応をいたします。",
    ],
  },
  {
    title: "商品の購入について",
    body: [
      "商品の購入・決済・配送・返品等の取引は、リンク先の販売事業者とお客様との間で行われるものであり、当サイトは取引の当事者にはなりません。取引に関するお問い合わせは、各販売事業者にお願いいたします。",
    ],
  },
  {
    title: "損害等の責任について",
    body: [
      "当サイトの利用および掲載情報に起因してご利用者に生じたトラブル・損失・損害について、当サイトは法令上責任を負うべき場合を除き、責任を負いかねます。あらかじめご了承ください。",
    ],
  },
  {
    title: "アフィリエイトプログラムについて",
    body: [
      "当サイトは、Amazonアソシエイト・プログラムおよび楽天アフィリエイト(もしもアフィリエイト経由)の参加者です。Amazonのアソシエイトとして、ヒノマルシェは適格販売により収入を得ています。",
      "紹介料の有無や金額が、AI日本度の判定結果に影響することはありません。",
    ],
  },
  {
    title: "商標・著作権について",
    body: [
      "Amazon、楽天市場、その他の記載されている会社名・サービス名・商品名は、各社の商標または登録商標です。",
      "掲載している商品画像・商品説明は、各モールのAPI利用規約に基づいて表示しています。権利者からの削除のお申し出があった場合は、確認のうえ速やかに対応いたします。",
    ],
  },
  {
    title: "免責事項の変更について",
    body: [
      "本免責事項は、予告なく内容を変更することがあります。変更後の内容は、当ページに掲載した時点から適用されます。",
    ],
  },
];

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs tracking-[0.35em] text-hinomaru font-medium uppercase">
        Disclaimer
      </p>
      <h1 className="mt-2 font-mincho text-3xl md:text-4xl font-semibold">
        免責事項
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
