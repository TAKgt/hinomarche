import type { Metadata } from "next";
import Link from "next/link";
import { getProductIndexAuditRecords } from "@/lib/db";
import {
  EDITORIAL_PRIORITY_THEMES,
  selectEditorialPriorityCandidates,
} from "@/lib/editorial-priority";
import { displayProductTitle } from "@/lib/product-title";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "編集優先候補",
  robots: { index: false, follow: false, nocache: true },
};

function formatPrice(value: number | null): string {
  return value == null ? "未取得" : `${value.toLocaleString("ja-JP")}円`;
}

export default async function EditorialPriorityAdminPage() {
  const evaluatedAt = new Date();
  const products = await getProductIndexAuditRecords();
  const selection = selectEditorialPriorityCandidates(products, evaluatedAt);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">PRIVATE EDITORIAL</p>
          <h1 className="mt-2 font-mincho text-3xl font-semibold">編集優先候補</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sumi-soft">
            技術品質を満たす商品から4テーマ各5件を抽出した、一次情報確認前の候補です。
            候補であることは、人手確認済みまたは編集品質達成を意味しません。
          </p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm" aria-label="管理画面">
          <Link href="/admin/actions" className="font-medium text-hinomaru hover:underline">商品改善候補</Link>
          <Link href="/admin/collections" className="font-medium text-hinomaru hover:underline">特集・産地別</Link>
        </nav>
      </div>

      <section className="grid grid-cols-2 border-b border-line md:grid-cols-4">
        {EDITORIAL_PRIORITY_THEMES.map((theme) => (
          <div key={theme.id} className="border-r border-line px-4 py-5 last:border-r-0">
            <p className="text-xs leading-relaxed text-sumi-soft">{theme.label}</p>
            <p className="mt-1 font-mincho text-2xl font-semibold">
              {selection.selectedByTheme[theme.id]}件
            </p>
            <p className="mt-1 text-xs text-sumi-soft">
              技術対象の一致 {selection.matchingEligibleByTheme[theme.id]}件
            </p>
          </div>
        ))}
      </section>

      <div className="border-b border-line py-5 text-sm leading-relaxed text-sumi-soft">
        <p>
          技術対象 {selection.technicalEligiblePool}件から選定。不整合
          {selection.informationInconsistentExcluded}件は候補から除外しています。
        </p>
        <p className="mt-1">
          候補順には、AI根拠種別、販売元レビュー件数、AI日本度、既存掲載スコアを利用します。
          実物評価や品質ランキングではありません。
        </p>
        <p className="mt-1">
          閲覧時に再計算され、選定結果や一次情報はこの画面からDBへ保存しません。
        </p>
      </div>

      <section className="border-b border-line py-7">
        <h2 className="font-mincho text-xl font-semibold">人手確認の完了条件</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-relaxed text-sumi-soft md:grid-cols-5">
          {[
            "メーカー・自治体・産地団体等の公式HTTPS URL",
            "商品との対応が分かる型番・名称",
            "主張を支える必要最小限の根拠箇所",
            "取得日と人手確認日",
            "他候補との独自比較項目",
          ].map((item, index) => (
            <li key={item} className="border border-line bg-white/60 p-4">
              <span className="mr-2 font-medium text-hinomaru">{index + 1}.</span>{item}
            </li>
          ))}
        </ol>
      </section>

      {EDITORIAL_PRIORITY_THEMES.map((theme) => {
        const candidates = selection.candidates.filter((candidate) => candidate.theme.id === theme.id);
        return (
          <section key={theme.id} className="border-b border-line py-9">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="font-mincho text-2xl font-semibold">{theme.label}</h2>
                <p className="mt-2 text-sm text-sumi-soft">確認目的: {theme.verificationGoal}</p>
              </div>
              <p className="text-xs text-sumi-soft">候補 {candidates.length} / {selection.targetPerTheme}件</p>
            </div>

            {candidates.length === 0 ? (
              <p className="mt-5 border-y border-line py-8 text-center text-sm text-sumi-soft">
                技術品質を満たす候補がありません。
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto border-t border-line">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="bg-washi-deep/70 text-xs text-sumi-soft">
                    <tr>
                      <th className="px-3 py-3 font-medium">商品</th>
                      <th className="px-3 py-3 font-medium">販売元</th>
                      <th className="px-3 py-3 text-right font-medium">取得価格</th>
                      <th className="px-3 py-3 text-right font-medium">販売元レビュー</th>
                      <th className="px-3 py-3 text-right font-medium">AI日本度</th>
                      <th className="px-3 py-3 font-medium">現在の状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(({ product }) => (
                      <tr key={product.id} className="border-b border-line align-top hover:bg-white/50">
                        <td className="max-w-lg px-3 py-4">
                          <Link href={`/product/${product.id}`} className="font-medium hover:text-hinomaru hover:underline">
                            {displayProductTitle(product.title)}
                          </Link>
                        </td>
                        <td className="px-3 py-4">{product.source === "rakuten" ? "楽天市場" : "Amazon"}</td>
                        <td className="px-3 py-4 text-right tabular-nums">{formatPrice(product.price)}</td>
                        <td className="px-3 py-4 text-right tabular-nums">{product.reviewCount ?? 0}件</td>
                        <td className="px-3 py-4 text-right tabular-nums">{product.score ?? "-"}</td>
                        <td className="px-3 py-4 text-xs leading-relaxed text-sumi-soft">
                          一次情報未確認・編集候補
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      <p className="mt-5 text-right text-xs text-sumi-soft">
        再計算日時: {evaluatedAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
      </p>
    </div>
  );
}
