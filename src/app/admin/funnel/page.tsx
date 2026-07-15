import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminProductFunnelReport,
  type AdminProductFunnelRow,
} from "@/lib/db";
import { displayProductTitle } from "@/lib/product-title";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商品導線",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

function ratio(events: number, base: number): string {
  if (base === 0) return "-";
  return `${((Math.min(events, base) / base) * 100).toFixed(1)}%`;
}

function status(row: AdminProductFunnelRow): string {
  if (row.impressions28d < 100) return "蓄積中";
  const detailRate = Math.min(row.listingDetailViews28d, row.impressions28d) / row.impressions28d;
  const directRate = Math.min(row.listingOutboundClicks28d, row.impressions28d) / row.impressions28d;
  if (detailRate < 0.03 && directRate < 0.03) return "カード確認";
  if (
    row.detailViews28d >= 50 &&
    Math.min(row.detailOutboundClicks28d, row.detailViews28d) / row.detailViews28d < 0.03
  ) return "詳細確認";
  return "経過観察";
}

export default async function ProductFunnelAdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase("ja");
  const report = await getAdminProductFunnelReport();
  const generatedAt = new Date(report.generatedAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rows = report.rows
    .filter((row) => {
      if (!query) return true;
      return `${row.title} ${row.categoryName}`.toLocaleLowerCase("ja").includes(query);
    })
    .sort(
      (a, b) =>
        b.impressions28d - a.impressions28d ||
        b.listingDetailViews28d - a.listingDetailViews28d,
    )
    .slice(0, 150);
  const totals = report.rows.reduce(
    (sum, row) => ({
      impressions: sum.impressions + row.impressions28d,
      listingDetails: sum.listingDetails + row.listingDetailViews28d,
      listingOutbound: sum.listingOutbound + row.listingOutboundClicks28d,
      detailOutbound: sum.detailOutbound + row.detailOutboundClicks28d,
    }),
    { impressions: 0, listingDetails: 0, listingOutbound: 0, detailOutbound: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">PRIVATE ANALYTICS</p>
          <h1 className="mt-2 font-mincho text-3xl font-semibold">商品導線</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin/actions" className="font-medium text-hinomaru hover:underline">商品改善候補</Link>
          <Link href="/admin/surfaces" className="font-medium text-hinomaru hover:underline">掲載面・表示位置</Link>
          <Link href="/admin/ranking" className="font-medium text-hinomaru hover:underline">運営ランキング</Link>
          <Link href="/admin/collections" className="font-medium text-hinomaru hover:underline">特集・産地別</Link>
          <p className="text-sumi-soft">直近28日 / {generatedAt}時点</p>
        </div>
      </div>

      <section className="grid grid-cols-2 border-b border-line md:grid-cols-4">
        {[
          ["カード表示", `${totals.impressions}回`],
          ["詳細閲覧", `${totals.listingDetails}回`],
          ["カードから販売先", `${totals.listingOutbound}回`],
          ["詳細から販売先", `${totals.detailOutbound}回`],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-line px-3 py-5 last:border-r-0 md:px-5">
            <p className="text-xs text-sumi-soft">{label}</p>
            <p className="mt-1 font-mincho text-xl font-semibold md:text-2xl">{value}</p>
          </div>
        ))}
      </section>

      <div className="border-b border-line py-5 text-xs leading-relaxed text-sumi-soft">
        <p>商品カードから詳細ページへ進んだ閲覧と、販売サイトへの移動を商品別に匿名集計します。</p>
        <p className="mt-1">IP、Cookie、User-Agent、セッションID、検索語は保存しません。同一人物の連続行動を示す購入率ではなく、イベント数の比率です。</p>
        <p className="mt-1">100表示未満は判断せず、公開順位へ自動反映しません。直接URLからの詳細閲覧は詳細閲覧総数だけに含めます。</p>
      </div>

      <form className="flex max-w-xl gap-2 py-6" action="/admin/funnel">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          maxLength={48}
          placeholder="商品名・ジャンルで絞り込み"
          className="min-w-0 flex-1 border border-line bg-white px-3 py-2 text-sm outline-none focus:border-hinomaru"
        />
        <button type="submit" className="border border-sumi bg-sumi px-4 py-2 text-sm text-white hover:bg-black">絞り込む</button>
      </form>

      {rows.length === 0 ? (
        <p className="border-y border-line py-12 text-center text-sm text-sumi-soft">商品導線データを蓄積しています。</p>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-washi-deep/70 text-xs text-sumi-soft">
              <tr>
                <th className="px-3 py-3 font-medium">商品</th>
                <th className="px-3 py-3 font-medium">ジャンル</th>
                <th className="px-3 py-3 text-right font-medium">AI日本度</th>
                <th className="px-3 py-3 text-right font-medium">カード表示</th>
                <th className="px-3 py-3 text-right font-medium">詳細閲覧</th>
                <th className="px-3 py-3 text-right font-medium">詳細閲覧率</th>
                <th className="px-3 py-3 text-right font-medium">カード→販売先</th>
                <th className="px-3 py-3 text-right font-medium">詳細総数</th>
                <th className="px-3 py-3 text-right font-medium">詳細→販売先</th>
                <th className="px-3 py-3 font-medium">目安</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const result = status(row);
                return (
                  <tr key={row.productId} className="border-b border-line hover:bg-white/50">
                    <td className="max-w-[300px] px-3 py-4">
                      <Link href={`/product/${row.productId}`} className="font-medium hover:text-hinomaru" target="_blank">
                        {displayProductTitle(row.title)}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-xs text-sumi-soft">{row.categoryName}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.aiScore}%</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.impressions28d}</td>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums">{row.listingDetailViews28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{ratio(row.listingDetailViews28d, row.impressions28d)}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.listingOutboundClicks28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.detailViews28d}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.detailOutboundClicks28d}</td>
                    <td className={`px-3 py-4 text-xs ${result === "蓄積中" ? "text-sumi-soft" : "font-medium text-hinomaru"}`}>{result}</td>
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
