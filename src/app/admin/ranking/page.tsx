import type { Metadata } from "next";
import Link from "next/link";
import { getAdminRankingReport, type AdminRankingRow } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "運営ランキング",
  robots: { index: false, follow: false, nocache: true },
};

type View = "promote" | "decline" | "all";
type Props = { searchParams: Promise<{ view?: string; q?: string }> };

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function rawCtr(row: AdminRankingRow): string {
  if (row.impressions28d === 0) return "-";
  return percent(row.listingClicks28d / row.impressions28d);
}

function changeLabel(row: AdminRankingRow): string {
  const change = row.proposedScore - row.currentScore;
  if (change >= 10) return `+${change}`;
  return String(change);
}

function tabClass(active: boolean): string {
  return active
    ? "border-hinomaru bg-hinomaru text-white"
    : "border-line bg-white/60 text-sumi hover:border-hinomaru";
}

export default async function RankingAdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const view: View = params.view === "decline" || params.view === "all"
    ? params.view
    : "promote";
  const query = (params.q ?? "").trim().toLocaleLowerCase("ja");
  const report = await getAdminRankingReport();

  const totalViews = report.rows.reduce((sum, row) => sum + row.pageViews28d, 0);
  const totalClicks = report.rows.reduce(
    (sum, row) => sum + row.outboundClicks28d,
    0
  );
  const totalImpressions = report.rows.reduce(
    (sum, row) => sum + row.impressions28d,
    0,
  );
  const promoteCount = report.rows.filter(
    (row) => row.proposedScore - row.currentScore >= 10
  ).length;
  const declineCount = report.rows.filter(
    (row) => row.proposedScore - row.currentScore <= -10
  ).length;

  const visibleRows = report.rows
    .filter((row) => {
      const change = row.proposedScore - row.currentScore;
      if (view === "promote" && change < 10) return false;
      if (view === "decline" && change > -10) return false;
      if (!query) return true;
      return `${row.title} ${row.categoryName}`.toLocaleLowerCase("ja").includes(query);
    })
    .sort((a, b) => {
      const aChange = a.proposedScore - a.currentScore;
      const bChange = b.proposedScore - b.currentScore;
      if (view === "decline") return aChange - bChange;
      if (view === "all") return b.proposedScore - a.proposedScore;
      return bChange - aChange;
    })
    .slice(0, 100);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">PRIVATE ANALYTICS</p>
          <h1 className="mt-2 font-mincho text-3xl font-semibold">運営ランキング</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin/actions" className="font-medium text-hinomaru hover:underline">
            商品改善候補
          </Link>
          <Link href="/admin/surfaces" className="font-medium text-hinomaru hover:underline">
            掲載面・表示位置
          </Link>
          <Link href="/admin/funnel" className="font-medium text-hinomaru hover:underline">
            商品導線
          </Link>
          <Link href="/admin/collections" className="font-medium text-hinomaru hover:underline">
            特集・産地別の成果
          </Link>
          <p className="text-sumi-soft">集計日: {report.calculatedOn ?? "未集計"} / 直近28日</p>
        </div>
      </div>

      <section className="grid grid-cols-2 border-b border-line md:grid-cols-6">
        {[
          ["対象商品", `${report.rows.length}件`],
          ["商品閲覧", `${totalViews}回`],
          ["カード表示", `${totalImpressions}回`],
          ["販売サイト移動", `${totalClicks}回`],
          ["昇格候補", `${promoteCount}件`],
          ["降格候補", `${declineCount}件`],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-line px-4 py-5 last:border-r-0">
            <p className="text-xs text-sumi-soft">{label}</p>
            <p className="mt-1 font-mincho text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <nav className="flex gap-2" aria-label="ランキング表示">
          <Link href="/admin/ranking" className={`border px-4 py-2 text-sm ${tabClass(view === "promote")}`}>
            昇格候補
          </Link>
          <Link href="/admin/ranking?view=decline" className={`border px-4 py-2 text-sm ${tabClass(view === "decline")}`}>
            降格候補
          </Link>
          <Link href="/admin/ranking?view=all" className={`border px-4 py-2 text-sm ${tabClass(view === "all")}`}>
            全商品
          </Link>
        </nav>
        <form className="flex min-w-0 gap-2" action="/admin/ranking">
          <input type="hidden" name="view" value={view} />
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="商品名・ジャンル"
            className="min-w-0 border border-line bg-white px-3 py-2 text-sm outline-none focus:border-hinomaru"
          />
          <button type="submit" className="border border-sumi bg-sumi px-4 py-2 text-sm text-white hover:bg-black">
            検索
          </button>
        </form>
      </div>

      {report.rows.length === 0 ? (
        <p className="border-y border-line py-12 text-center text-sumi-soft">
          ランキング集計はまだありません。
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-washi-deep/70 text-xs text-sumi-soft">
              <tr>
                <th className="px-3 py-3 font-medium">商品</th>
                <th className="px-3 py-3 font-medium">ジャンル</th>
                <th className="px-3 py-3 text-right font-medium">AI日本度</th>
                <th className="px-3 py-3 text-right font-medium">現在</th>
                <th className="px-3 py-3 text-right font-medium">候補</th>
                <th className="px-3 py-3 text-right font-medium">変化</th>
                <th className="px-3 py-3 text-right font-medium">閲覧</th>
                <th className="px-3 py-3 text-right font-medium">カード表示</th>
                <th className="px-3 py-3 text-right font-medium">一覧移動</th>
                <th className="px-3 py-3 text-right font-medium">掲載面CTR</th>
                <th className="px-3 py-3 font-medium">判定理由</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const change = row.proposedScore - row.currentScore;
                return (
                  <tr key={row.productId} className="border-b border-line align-top hover:bg-white/50">
                    <td className="max-w-sm px-3 py-4">
                      <Link href={`/product/${row.productId}`} className="font-medium hover:text-hinomaru hover:underline">
                        {row.title}
                      </Link>
                      <p className="mt-1 text-xs text-sumi-soft">{row.source === "rakuten" ? "楽天市場" : "Amazon"}</p>
                    </td>
                    <td className="px-3 py-4">{row.categoryName}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.aiScore}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.currentScore}</td>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums">{row.proposedScore}</td>
                    <td className={`px-3 py-4 text-right font-semibold tabular-nums ${change >= 10 ? "text-hinomaru" : change <= -10 ? "text-sumi-soft" : ""}`}>
                      {changeLabel(row)}
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.pageViews28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.impressions28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.listingClicks28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums" title={`補正CTR ${percent(row.smoothedCtr)}`}>
                      {rawCtr(row)}
                    </td>
                    <td className="max-w-xs px-3 py-4 text-xs leading-relaxed text-sumi-soft">{row.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {report.rows.length > 0 && visibleRows.length === 0 && (
        <p className="border-b border-line py-10 text-center text-sumi-soft">該当する商品はありません。</p>
      )}
      {visibleRows.length === 100 && (
        <p className="mt-4 text-right text-xs text-sumi-soft">上位100件を表示</p>
      )}
    </div>
  );
}
