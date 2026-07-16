import Link from "next/link";
import type { CommercialTopic } from "@/lib/commercial-topics";

export function CommercialTopicNav({
  topics,
  heading = "購入目的から3テーマを比較",
  description = "商品数を広く見る前に、用途と予算が近い候補を絞って比較できます。",
}: {
  topics: CommercialTopic[];
  heading?: string;
  description?: string;
}) {
  if (topics.length === 0) return null;

  return (
    <section className="border-b border-line bg-white/25">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
        <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">START HERE</p>
        <h2 className="mt-2 font-mincho text-2xl font-semibold md:text-3xl">{heading}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sumi-soft">{description}</p>
        <div className="mt-6 grid border-l border-t border-line md:grid-cols-3">
          {topics.map((topic) => (
            <article key={topic.slug} className="flex flex-col border-b border-r border-line bg-washi/55 p-5">
              <p className="text-[11px] font-medium tracking-[0.18em] text-hinomaru">
                {topic.eyebrow}
              </p>
              <h3 className="mt-2 font-mincho text-xl font-semibold">{topic.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-sumi-soft">
                {topic.description}
              </p>
              <Link
                href={topic.href}
                className="mt-5 block bg-sumi px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-hinomaru"
              >
                {topic.linkLabel}
              </Link>
              {topic.secondaryHref && topic.secondaryLabel && (
                <Link
                  href={topic.secondaryHref}
                  className="mt-2 block border border-sumi/20 px-4 py-2.5 text-center text-xs font-medium transition-colors hover:border-hinomaru hover:text-hinomaru"
                >
                  {topic.secondaryLabel}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
