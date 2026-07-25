import Link from "next/link";
import type { CommercialTopic } from "@/lib/commercial-topics";

export function CommercialTopicNav({
  topics,
  heading = "目的・予算から探す",
  description = "用途や予算に合うテーマから商品を探せます。",
  showSecondary = true,
}: {
  topics: CommercialTopic[];
  heading?: string;
  description?: string;
  showSecondary?: boolean;
}) {
  if (topics.length === 0) return null;

  return (
    <section className="border-b border-line bg-white/25">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
        <p className="text-xs font-medium tracking-[0.3em] text-hinomaru">SHOP BY NEED</p>
        <h2 className="mt-2 font-mincho text-2xl font-semibold md:text-3xl">{heading}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sumi-soft">{description}</p>
        <div
          className="-mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 md:mx-0 md:grid md:grid-cols-2 md:gap-0 md:overflow-visible md:border-l md:border-t md:border-line md:px-0 lg:grid-cols-4"
          role="list"
          aria-label={heading}
        >
          {topics.map((topic, index) => (
            <article
              key={topic.slug}
              className="flex h-full w-[82vw] shrink-0 snap-start flex-col border border-line bg-white p-5 md:w-auto md:border-l-0 md:border-t-0 md:p-6"
              role="listitem"
            >
              <p className="font-mincho text-lg text-hinomaru/65">0{index + 1}</p>
              <p className="text-[11px] font-medium tracking-[0.18em] text-hinomaru">
                {topic.eyebrow}
              </p>
              <h3 className="mt-2 font-mincho text-xl font-semibold">{topic.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-sumi-soft">
                {topic.description}
              </p>
              <div className="mt-auto pt-5">
                <Link
                  href={topic.href}
                  className="block bg-sumi px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-hinomaru"
                >
                  {topic.linkLabel}
                </Link>
                {showSecondary && topic.secondaryHref && topic.secondaryLabel && (
                  <Link
                    href={topic.secondaryHref}
                    className="mt-2 block border border-sumi/20 px-4 py-2.5 text-center text-xs font-medium transition-colors hover:border-hinomaru hover:text-hinomaru"
                  >
                    {topic.secondaryLabel}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
