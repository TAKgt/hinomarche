"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function ErrorPage({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      role="alert"
      aria-labelledby="error-heading"
      className="mx-auto max-w-3xl px-5 py-24 text-center"
    >
      <span aria-hidden className="inline-block size-14 rounded-full bg-hinomaru/20" />
      <h1
        ref={headingRef}
        id="error-heading"
        tabIndex={-1}
        className="mt-6 font-mincho text-3xl font-semibold outline-none"
      >
        ページを読み込めませんでした
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-sumi-soft">
        一時的な通信エラーの可能性があります。時間をおいて、もう一度お試しください。
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="bg-sumi px-8 py-3 text-sm font-medium tracking-[0.12em] text-washi transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
        >
          もう一度試す
        </button>
        <Link
          href="/"
          className="border border-line px-8 py-3 text-sm font-medium transition-colors hover:border-sumi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
