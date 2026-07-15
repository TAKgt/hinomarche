import type { Metadata } from "next";
import Link from "next/link";
import { getAdminRankingReport, type AdminRankingRow } from "@/lib/db";
import {
  classifyProductOpportunity,
  type ProductOpportunityAction,
} from "@/lib/product-opportunity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商品改善候補",
  robots: { index: false, follow: false, nocache: true },
};

type View = "actionable" | "scale" | "review" | "maintain" | "collect" | "all";
type Props = { searchParams: Promise<{ view?: string; q?: string }> };

const ACTION_LABELS: Record<ProductOpportunityAction, string> = {
  scale: "掲載強化",
  review: "見直し",
  maintain: "維持",
  collect: "蓄積中",
};

const ACTION_STYLES: Record<ProductOpportunityAction, string> = {
  scale: "border-hinomaru bg-hinomaru text-white",
  review: "border-sumi bg-sumi text-white",
  maintain: "border-line bg-white text-sumi",
  collect: "border-line bg-washi-deep text-sumi-soft",
};

function isView(value: string | undefined): value is View {
  return ["actionable", "scale", "review", "maintain", "collect", "all"].includes(value ?? "");
}

function percent(value: number | null): string {
  return value === null ? "-" : `${(value * 100).toFixed(1)}%`;
}

function tabClass(active: boolean): string {
  return active
    ? "border-hinomaru bg-hinomaru text-white"
    : "border-line bg-white/60 text-sumi hover:border-hinomaru";
}

function matchesView(action: ProductOpportunityAction, view: View): boolean {
  if (view === "all") return true;
  if (view === "actionable") return action === "scale" || action === "review";
  return action === view;
}

export default async function ProductActionsAdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedView: View = isView(params.view) ? params.view : "actionable";
  const query = (params.q ?? "").trim().toLocaleLowerCase("ja");
  const report = await getAdminRankingReport();
  const rows = report.rows.map((row) => ({
    row,
    opportunity: classifyProductOpportunity(row),
  }));
  const counts = rows.reduce<Record<ProductOpportunityAction, number>>(
    (result, item) => {
      result[item.opportunity.action] += 1;
      return result;
    },
    { scale: 0, review: 0, maintain: 0, collect: 0 },
  );
  const actionableCount = counts.scale + counts.review;
  const view = requestedView === "actionable" && actionableCount === 0
    ? "collect"
    : requestedView;
  const visibleRows = rows
    .filter(({ row, opportunity }) => {
      if (!matchesView(opportunity.action, view)) return false;
      if (!query) return true;
      return `${row.title} ${row.categoryName}`.toLocaleLowerCase("ja").includes(query);
    })
    .sort((a, b) => b.opportunity.priority - a.opportunity.priority)
    .slice(0, 100);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">PRIVATE ANALYTICS</p>
          <h1 className="mt-2 font-mincho text-3xl font-semibold">商品改善候補</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin/ranking" className="font-medium text-hinomaru hover:underline">運営ランキング</Link>
          <Link href="/admin/surfaces" className="font-medium text-hinomaru hover:underline">掲載面・表示位置</Link>
          <Link href="/admin/collections" className="font-medium text-hinomaru hover:underline">特集・産地別</Link>
          <p className="text-sumi-soft">集計日: {report.calculatedOn ?? "未集計"} / 直近28日</p>
        </div>
      </div>

      <section className="grid grid-cols-2 border-b border-line md:grid-cols-4">
        {([
          ["掲載強化", counts.scale],
          ["見直し", counts.review],
          ["維持", counts.maintain],
          ["蓄積中", counts.collect],
        ] as const).map(([label, value]) => (
          <div key={label} className="border-r border-line px-4 py-5 last:border-r-0">
            <p className="text-xs text-sumi-soft">{label}</p>
            <p className="mt-1 font-mincho text-2xl font-semibold">{value}件</p>
          </div>
        ))}
      </section>

      <div className="border-b border-line py-5 text-xs leading-relaxed text-sumi-soft">
        <p>100表示未満は判断せず、200表示以上かつ補正後CTR3%未満だけを見直し候補にします。</p>
        <p className="mt-1">掲載強化は10移動以上かつ補正後CTR10%以上が条件です。候補は公開順位へ自動反映しません。</p>
        <p className="mt-1">IP、Cookie、User-Agent、セッションIDは保存せず、商品カードの表示と販売サイト移動だけを利用します。</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <nav className="flex flex-wrap gap-2" aria-label="改善候補表示">
          {([
            ["actionable", `要対応 ${actionableCount}`],
            ["scale", `掲載強化 ${counts.scale}`],
            ["review", `見直し ${counts.review}`],
            ["maintain", `維持 ${counts.maintain}`],
            ["collect", `蓄積中 ${counts.collect}`],
            ["all", "全商品"],
          ] as const).map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/actions?view=${key}`}
              className={`border px-3 py-2 text-sm ${tabClass(view === key)}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <form className="flex min-w-0 gap-2" action="/admin/actions">
          <input type="hidden" name="view" value={view} />
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="商品名・ジャンル"
            className="min-w-0 border border-line bg-white px-3 py-2 text-sm outline-none focus:border-hinomaru"
          />
          <button type="submit" className="border border-sumi bg-sumi px-4 py-2 text-sm text-white hover:bg-black">検索</button>
        </form>
      </div>

      {report.rows.length === 0 ? (
        <p className="border-y border-line py-12 text-center text-sumi-soft">ランキング集計はまだありません。</p>
      ) : visibleRows.length === 0 ? (
        <p className="border-y border-line py-12 text-center text-sumi-soft">該当する改善候補はありません。</p>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-washi-deep/70 text-xs text-sumi-soft">
              <tr>
                <th className="px-3 py-3 font-medium">判定</th>
                <th className="px-3 py-3 font-medium">商品</th>
                <th className="px-3 py-3 font-medium">ジャンル</th>
                <th className="px-3 py-3 text-right font-medium">AI日本度</th>
                <th className="px-3 py-3 text-right font-medium">カード表示</th>
                <th className="px-3 py-3 text-right font-medium">一覧移動</th>
                <th className="px-3 py-3 text-right font-medium">掲載面CTR</th>
                <th className="px-3 py-3 text-right font-medium">商品閲覧</th>
                <th className="px-3 py-3 text-right font-medium">外部移動計</th>
                <th className="px-3 py-3 font-medium">判定理由</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row, opportunity }: { row: AdminRankingRow; opportunity: ReturnType<typeof classifyProductOpportunity> }) => (
                <tr key={row.productId} className="border-b border-line align-top hover:bg-white/50">
                  <td className="px-3 py-4">
                    <span className={`inline-block border px-2 py-1 text-xs font-medium ${ACTION_STYLES[opportunity.action]}`}>
                      {ACTION_LABELS[opportunity.action]}
                    </span>
                  </td>
                  <td className="max-w-sm px-3 py-4">
                    <Link href={`/product/${row.productId}`} className="font-medium hover:text-hinomaru hover:underline">{row.title}</Link>
                    <p className="mt-1 text-xs text-sumi-soft">{row.source === "rakuten" ? "楽天市場" : "Amazon"}</p>
                  </td>
                  <td className="px-3 py-4">{row.categoryName}</td>
                  <td className="px-3 py-4 text-right tabular-nums">{row.aiScore}</td>
                  <td className="px-3 py-4 text-right tabular-nums">{row.impressions28d}</td>
                  <td className="px-3 py-4 text-right font-semibold tabular-nums">{row.listingClicks28d}</td>
                  <td className="px-3 py-4 text-right tabular-nums" title={`補正CTR ${(row.smoothedCtr * 100).toFixed(1)}%`}>
                    {percent(opportunity.rawCtr)}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums">{row.pageViews28d}</td>
                  <td className="px-3 py-4 text-right tabular-nums">{row.outboundClicks28d}</td>
                  <td className="max-w-xs px-3 py-4 text-xs leading-relaxed text-sumi-soft">{opportunity.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visibleRows.length === 100 && <p className="mt-4 text-right text-xs text-sumi-soft">優先度上位100件を表示</p>}
    </div>
  );
}
