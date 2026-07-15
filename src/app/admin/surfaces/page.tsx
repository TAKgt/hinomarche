import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminSurfacePositionReport,
  type AdminSurfacePositionRow,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "掲載面・表示位置の成果",
  robots: { index: false, follow: false, nocache: true },
};

const SURFACE_LABELS: Record<AdminSurfacePositionRow["surface"], string> = {
  home: "TOP",
  category: "ジャンル",
  feature: "特集",
  region: "産地・工芸",
  related: "関連商品",
};

const SURFACE_ORDER = ["home", "category", "feature", "region", "related"] as const;

function ratio(clicks: number, impressions: number): string {
  if (impressions === 0) return "-";
  const boundedClicks = Math.min(clicks, impressions);
  return `${((boundedClicks / impressions) * 100).toFixed(1)}%`;
}

function dataStatus(row: AdminSurfacePositionRow): string {
  if (row.impressions28d >= 100 && row.listingClicks28d >= 3) return "比較可能";
  return "蓄積中";
}

export default async function SurfacePositionAdminPage() {
  const report = await getAdminSurfacePositionReport();
  const generatedAt = new Date(report.generatedAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rows = [...report.rows].sort(
    (a, b) =>
      SURFACE_ORDER.indexOf(a.surface) - SURFACE_ORDER.indexOf(b.surface) ||
      a.position - b.position,
  );
  const totalImpressions = rows.reduce((sum, row) => sum + row.impressions28d, 0);
  const totalClicks = rows.reduce((sum, row) => sum + row.listingClicks28d, 0);
  const readyRows = rows.filter((row) => dataStatus(row) === "比較可能").length;
  const activeSurfaces = new Set(rows.map((row) => row.surface)).size;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">PRIVATE ANALYTICS</p>
          <h1 className="mt-2 font-mincho text-3xl font-semibold">掲載面・表示位置の成果</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin/ranking" className="font-medium text-hinomaru hover:underline">
            運営ランキング
          </Link>
          <Link href="/admin/collections" className="font-medium text-hinomaru hover:underline">
            特集・産地別
          </Link>
          <p className="text-sumi-soft">直近28日 / {generatedAt}時点</p>
        </div>
      </div>

      <section className="grid grid-cols-2 border-b border-line md:grid-cols-4">
        {[
          ["計測面", `${activeSurfaces}面`],
          ["カード表示", `${totalImpressions}回`],
          ["一覧移動", `${totalClicks}回`],
          ["比較可能", `${readyRows}位置`],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-line px-3 py-5 last:border-r-0 md:px-5">
            <p className="text-xs text-sumi-soft">{label}</p>
            <p className="mt-1 font-mincho text-xl font-semibold md:text-2xl">{value}</p>
          </div>
        ))}
      </section>

      <div className="border-b border-line py-5 text-xs leading-relaxed text-sumi-soft">
        <p>掲載面ごとに、カードの表示位置がクリック率へ与える影響を匿名集計しています。</p>
        <p className="mt-1">100表示・3移動未満は比較せず、位置補正や公開順位へ自動反映しません。</p>
        <p className="mt-1">クリック率は異常な連打の影響を抑えるため、表示数を上限に計算します。</p>
      </div>

      {rows.length === 0 ? (
        <p className="border-b border-line py-12 text-center text-sm text-sumi-soft">
          掲載位置データを蓄積しています。
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-washi-deep/70 text-xs text-sumi-soft">
              <tr>
                <th className="px-3 py-3 font-medium">掲載面</th>
                <th className="px-3 py-3 text-right font-medium">表示位置</th>
                <th className="px-3 py-3 text-right font-medium">掲載商品</th>
                <th className="px-3 py-3 text-right font-medium">カード表示</th>
                <th className="px-3 py-3 text-right font-medium">一覧移動</th>
                <th className="px-3 py-3 text-right font-medium">掲載面CTR</th>
                <th className="px-3 py-3 font-medium">判定状態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = dataStatus(row);
                return (
                  <tr key={`${row.surface}-${row.position}`} className="border-b border-line hover:bg-white/50">
                    <td className="px-3 py-4 font-medium">{SURFACE_LABELS[row.surface]}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.position}位</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.productsSeen28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.impressions28d}</td>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums">{row.listingClicks28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{ratio(row.listingClicks28d, row.impressions28d)}</td>
                    <td className={`px-3 py-4 text-xs ${status === "比較可能" ? "font-medium text-hinomaru" : "text-sumi-soft"}`}>
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
