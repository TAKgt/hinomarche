import type { Metadata } from "next";
import Link from "next/link";
import { getAdminCollectionReport } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "特集・産地別の成果",
  robots: { index: false, follow: false, nocache: true },
};

function ratio(clicks: number, views: number): string {
  if (views === 0) return "-";
  return `${((clicks / views) * 100).toFixed(1)}%`;
}

export default async function CollectionAdminPage() {
  const report = await getAdminCollectionReport();
  const generatedAt = new Date(report.generatedAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rows = [...report.rows].sort(
    (a, b) =>
      b.outboundClicks28d - a.outboundClicks28d ||
      b.pageViews28d - a.pageViews28d ||
      a.name.localeCompare(b.name, "ja"),
  );
  const featureCount = rows.filter((row) => row.kind === "feature").length;
  const regionCount = rows.filter((row) => row.kind === "region").length;
  const rowsWithClicks = rows.filter((row) => row.outboundClicks28d > 0).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">PRIVATE ANALYTICS</p>
          <h1 className="mt-2 font-mincho text-3xl font-semibold">特集・産地別の成果</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin/ranking" className="font-medium text-hinomaru hover:underline">
            運営ランキング
          </Link>
          <p className="text-sumi-soft">直近28日 / {generatedAt}時点</p>
        </div>
      </div>

      <section className="grid grid-cols-3 border-b border-line">
        {[
          ["特集", `${featureCount}件`],
          ["産地・工芸", `${regionCount}件`],
          ["移動あり", `${rowsWithClicks}件`],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-line px-3 py-5 last:border-r-0 md:px-5">
            <p className="text-xs text-sumi-soft">{label}</p>
            <p className="mt-1 font-mincho text-xl font-semibold md:text-2xl">{value}</p>
          </div>
        ))}
      </section>

      <div className="border-b border-line py-5 text-xs leading-relaxed text-sumi-soft">
        <p>
          各ページに表示される上伤24商品の実績を合算した参考値です。流入元を厳密に追跡した数値ではありません。
        </p>
        <p className="mt-1">
          同じ商品が複数の特集・産地に該当する場合はそれぞれに集計されます。一覧の直接ボタンからの移動も含むため、「移動/閲覧」が100%を超える場合があります。
        </p>
      </div>

      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-washi-deep/70 text-xs text-sumi-soft">
            <tr>
              <th className="px-3 py-3 font-medium">種類</th>
              <th className="px-3 py-3 font-medium">特集・産地</th>
              <th className="px-3 py-3 text-right font-medium">表示商品</th>
              <th className="px-3 py-3 text-right font-medium">商品閲覧</th>
              <th className="px-3 py-3 text-right font-medium">販売サイト移動</th>
              <th className="px-3 py-3 text-right font-medium">移動/閲覧</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.slug}`} className="border-b border-line hover:bg-white/50">
                <td className="px-3 py-4 text-sumi-soft">
                  {row.kind === "feature" ? "特集" : "産地・工芸"}
                </td>
                <td className="px-3 py-4 font-medium">
                  <Link
                    href={`/${row.kind}/${row.slug}`}
                    className="hover:text-hinomaru hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 py-4 text-right tabular-nums">{row.productCount}</td>
                <td className="px-3 py-4 text-right tabular-nums">{row.pageViews28d}</td>
                <td className="px-3 py-4 text-right font-semibold tabular-nums">
                  {row.outboundClicks28d}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {ratio(row.outboundClicks28d, row.pageViews28d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
