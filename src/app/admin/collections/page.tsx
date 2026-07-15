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
      b.listingClicks28d - a.listingClicks28d ||
      b.impressions28d - a.impressions28d ||
      a.name.localeCompare(b.name, "ja"),
  );
  const featureCount = rows.filter((row) => row.kind === "feature").length;
  const regionCount = rows.filter((row) => row.kind === "region").length;
  const rowsWithClicks = rows.filter((row) => row.listingClicks28d > 0).length;
  const rankingReadyCount = rows.filter((row) => row.isRankingReady).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">PRIVATE ANALYTICS</p>
          <h1 className="mt-2 font-mincho text-3xl font-semibold">特集・産地別の成果</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin/actions" className="font-medium text-hinomaru hover:underline">
            商品改善候補
          </Link>
          <Link href="/admin/surfaces" className="font-medium text-hinomaru hover:underline">
            掲載面・表示位置
          </Link>
          <Link href="/admin/ranking" className="font-medium text-hinomaru hover:underline">
            運営ランキング
          </Link>
          <p className="text-sumi-soft">直近28日 / {generatedAt}時点</p>
        </div>
      </div>

      <section className="grid grid-cols-2 border-b border-line md:grid-cols-4">
        {[
          ["特集", `${featureCount}件`],
          ["産地・工芸", `${regionCount}件`],
          ["移動あり", `${rowsWithClicks}件`],
          ["shadow判定可能", `${rankingReadyCount}件`],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-line px-3 py-5 last:border-r-0 md:px-5">
            <p className="text-xs text-sumi-soft">{label}</p>
            <p className="mt-1 font-mincho text-xl font-semibold md:text-2xl">{value}</p>
          </div>
        ))}
      </section>

      <div className="border-b border-line py-5 text-xs leading-relaxed text-sumi-soft">
        <p>
          各ページで実際に画面内へ表示された商品カードと、そのカードからの販売サイト移動を匿名集計しています。
        </p>
        <p className="mt-1">
          IP、Cookie、User-Agent、セッションIDは保存しません。商品詳細からの移動は掲載面CTRに含めません。
        </p>
        <p className="mt-1">
          shadowスコアは市場性と匿名反応を組み合わせた候補値です。30反応・3移動未満は判定せず、現在のTOP表示順には反映しません。
        </p>
      </div>

      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-washi-deep/70 text-xs text-sumi-soft">
            <tr>
              <th className="px-3 py-3 font-medium">種類</th>
              <th className="px-3 py-3 font-medium">特集・産地</th>
              <th className="px-3 py-3 text-right font-medium">表示商品</th>
              <th className="px-3 py-3 text-right font-medium">カード表示</th>
              <th className="px-3 py-3 text-right font-medium">一覧移動</th>
              <th className="px-3 py-3 text-right font-medium">掲載面CTR</th>
              <th className="px-3 py-3 text-right font-medium">shadow</th>
              <th className="px-3 py-3 font-medium">判定状態</th>
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
                <td className="px-3 py-4 text-right tabular-nums">{row.impressions28d}</td>
                <td className="px-3 py-4 text-right font-semibold tabular-nums">
                  {row.listingClicks28d}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {ratio(row.listingClicks28d, row.impressions28d)}
                </td>
                <td className="px-3 py-4 text-right font-semibold tabular-nums">
                  {row.shadowScore}
                </td>
                <td className="max-w-xs px-3 py-4 text-xs text-sumi-soft">
                  <span className={row.isRankingReady ? "font-medium text-hinomaru" : ""}>
                    {row.isRankingReady ? "判定可能" : "蓄積中"}
                  </span>
                  <span className="mt-1 block">{row.rankingReason}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
