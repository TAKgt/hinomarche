import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-28 text-center">
      <span aria-hidden className="inline-block size-14 rounded-full bg-hinomaru/20" />
      <h1 className="mt-6 font-mincho text-3xl font-semibold">
        ページが見つかりません
      </h1>
      <p className="mt-4 text-sm text-sumi-soft leading-relaxed">
        お探しの商品は掲載を終了したか、URLが変更された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-8 inline-block bg-sumi text-washi px-8 py-3 text-sm tracking-[0.2em] hover:bg-black transition-colors"
      >
        トップへ戻る
      </Link>
    </div>
  );
}
