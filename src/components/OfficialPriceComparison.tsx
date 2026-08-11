import { formatPrice } from "@/lib/format";
import type { OfficialPriceComparison } from "@/lib/official-price-comparisons";

function formatCheckedDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function OfficialPriceComparisonSection({
  comparison,
}: {
  comparison: OfficialPriceComparison;
}) {
  const checkedDate = formatCheckedDate(comparison.checkedAt);

  return (
    <section
      className="mt-14 border-y border-line py-8"
      aria-labelledby="official-price-comparison-heading"
    >
      <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">
        OFFICIAL PRICE CHECK
      </p>
      <h2
        id="official-price-comparison-heading"
        className="mt-2 font-mincho text-xl font-semibold md:text-2xl"
      >
        公式価格でセットと単品を比較
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sumi-soft">
        GLOBAL公式オンラインストアの税込価格を、同じ3型番で比べています。
        {checkedDate}確認。
      </p>

      <div className="mt-6 border border-line bg-white/60">
        <table className="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
          <colgroup>
            <col className="w-[31%]" />
            <col className="w-[41%]" />
            <col className="w-[28%]" />
          </colgroup>
          <thead className="bg-washi-deep text-xs text-sumi-soft">
            <tr>
              <th scope="col" className="px-2 py-3 font-medium sm:px-4">
                購入方法
              </th>
              <th scope="col" className="px-2 py-3 font-medium sm:px-4">
                内容
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-right font-medium sm:px-4"
              >
                公式税込価格
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line bg-hinomaru/[0.04]">
              <th
                scope="row"
                className="whitespace-nowrap px-2 py-3 font-medium sm:px-4"
              >
                {comparison.set.code}セット
              </th>
              <td className="break-words px-2 py-3 text-sumi-soft sm:px-4">
                G-46、GS-3、GSS-01
              </td>
              <td className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">
                {formatPrice(comparison.set.price)}
              </td>
            </tr>
            {comparison.individualItems.map((item) => (
              <tr key={item.code} className="border-t border-line">
                <th
                  scope="row"
                  className="whitespace-nowrap px-2 py-3 font-medium sm:px-4"
                >
                  単品 {item.code}
                </th>
                <td className="break-words px-2 py-3 text-sumi-soft sm:px-4">
                  {item.label}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-right sm:px-4">
                  {formatPrice(item.price)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-line bg-washi-deep/70">
              <th
                scope="row"
                className="whitespace-nowrap px-2 py-3 font-medium sm:px-4"
              >
                単品3点の合計
              </th>
              <td className="break-words px-2 py-3 text-sumi-soft sm:px-4">
                G-46、GS-3、GSS-01
              </td>
              <td className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">
                {formatPrice(comparison.individualTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 border-l-4 border-hinomaru bg-white/60 px-4 py-4 md:px-5">
        <p className="font-mincho text-lg font-semibold">
          セットは単品合計より{formatPrice(comparison.difference)}低い
        </p>
        <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
          単品合計を基準にすると約{comparison.differenceRatePercent}%の差です。
          三徳包丁、ペティーナイフ、簡易シャープナーの3点すべてが必要な場合の比較です。
          必要なものが一部だけなら、単品の価格もあわせてご確認ください。
        </p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-sumi-soft">
        ※ ポイント、送料、クーポン、在庫、名入れなどの条件は含めていません。
        価格は変わる場合があるため、購入時は公式ページの最新表示をご確認ください。
      </p>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {[comparison.set, ...comparison.individualItems].map((item) => (
          <li key={item.code}>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-hinomaru underline underline-offset-2 hover:text-hinomaru-deep"
            >
              {item.code}の公式ページ
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
