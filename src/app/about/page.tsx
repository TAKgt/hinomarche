import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "掲載方針とAI日本度",
  description:
    "ヒノマルシェの商品掲載方針、AI日本度（AI推定）の判定根拠、価格情報の取得日時、訂正窓口について。",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs tracking-[0.35em] text-hinomaru font-medium uppercase">
        About
      </p>
      <h1 className="mt-2 font-mincho text-3xl md:text-4xl font-semibold">
        ヒノマルシェの掲載方針とAI日本度
      </h1>

      <section className="mt-10 space-y-4 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          日本を、買って応援する
        </h2>
        <p>
          ヒノマルシェは「日本のいいものを選んで買うことが、日本のものづくりの応援になる」
          という考えから生まれたセレクトサイトです。日本とのかかわりが深い商品を中心に集め、
          Amazonと楽天市場の販売ページを紹介しています。
        </p>
        <p>
          燕三条の金属加工、堺の刃物、有田焼や波佐見焼の器、今治のタオル——
          日本各地のものづくりを、産地や商品情報を手がかりに探せます。
          AI日本度だけでなく、その判定根拠も確認できる形で掲載しています。
        </p>
      </section>

      <section className="mt-12 space-y-4 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          AI日本度は商品情報をもとにしたAI推定です
        </h2>
        <p>
          掲載商品には「AI日本度（AI推定）」を表示しています。AI(大規模言語モデル)が
          商品名・商品説明・メーカー・ブランド情報を解析し、次の基準で0〜100点に推定したものです。
        </p>
        <ul className="space-y-3 border border-line bg-white/60 p-5 text-sm">
          <li className="flex gap-3">
            <span className="shrink-0 font-mincho font-semibold text-hinomaru">80-100(高)</span>
            「日本製」「国産」の明記、または燕三条・今治・有田焼などの具体的な産地・工房の記載がある
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-mincho font-semibold text-kin">50-79(中)</span>
            日本のメーカー・ブランドだが、この商品の生産国が商品情報から確認できない
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-mincho font-semibold text-sumi-soft">0-49(低)</span>
            生産国が海外、または日本との関連が商品情報から確認できない(スコアを明示した上で掲載しています)
          </li>
        </ul>
        <p>
          スコアには必ず<strong>判定根拠</strong>(何を根拠にそう判定したか)を添えています。
        </p>
      </section>

      <section className="mt-12 space-y-4 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          注目順はAI日本度と市場性シグナルを組み合わせます
        </h2>
        <p>
          TOPページやカテゴリの「注目順」では、AI日本度の高さを前提に、モール内の検索順位、
          レビュー件数、レビュー平均、紹介料率などの市場性シグナルも加味しています。
          日本度が高くても、購入ニーズが弱いと推定される商品は後ろに回ることがあります。
        </p>
      </section>

      <section className="mt-12 space-y-4 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          価格の取得日時とAI日本度の判定根拠を確認できます
        </h2>
        <p>
          商品詳細や比較欄では、価格に取得日時を示しています。AI日本度にはAI推定であることと
          判定根拠を添えています。販売先の価格・在庫・商品情報は変わることがあるため、購入前に
          各販売ページで最新情報をご確認ください。
        </p>
        <p>
          掲載内容に誤りがある場合は、お問い合わせフォームの「掲載内容の誤り」から
          お知らせください。AI日本度判定に関するご指摘も受け付けています。
        </p>
      </section>

      <section className="mt-12 space-y-4 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          免責・個人情報・掲載内容の訂正窓口
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/disclaimer" className="text-hinomaru hover:underline">
              免責事項 →
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="text-hinomaru hover:underline">
              プライバシーポリシー →
            </Link>
          </li>
          <li>
            <Link href="/contact" className="text-hinomaru hover:underline">
              お問い合わせ →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
