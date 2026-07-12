import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "このサイトについて",
  description:
    "ヒノマルシェの趣旨と、AI日本度判定のしくみ、免責事項について。",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs tracking-[0.35em] text-hinomaru font-medium uppercase">
        About
      </p>
      <h1 className="mt-2 font-mincho text-3xl md:text-4xl font-semibold">
        このサイトについて
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
          日本各地には、世界に誇れるものづくりがあります。少し高くても長く使えるものを、
          作り手の顔が見えるものを。そんな選び方の手助けができれば幸いです。
        </p>
      </section>

      <section className="mt-12 space-y-4 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          「AI日本度判定」のしくみ
        </h2>
        <p>
          掲載商品にはAI(大規模言語モデル)による「日本度」スコアを表示しています。
          商品名・商品説明・メーカー情報を解析し、次の基準で0〜100点に推定したものです。
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
          注目順の考え方
        </h2>
        <p>
          TOPページやカテゴリの「注目順」では、AI日本度の高さを前提に、モール内の検索順位、
          レビュー件数、レビュー平均、紹介料率などの市場性シグナルも加味しています。
          日本度が高くても、購入ニーズが弱いと推定される商品は後ろに回ることがあります。
        </p>
      </section>

      <section className="mt-12 space-y-4 leading-relaxed">
        <h2 className="font-mincho text-xl font-semibold border-l-4 border-hinomaru pl-3">
          運営情報
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
