import type { ReactNode } from "react";

type Guide = {
  title: string;
  description: string;
  points: { title: string; description: string }[];
  officialLinks?: { href: string; label: string }[];
};

export function SelectionGuide({ guide, children }: { guide: Guide; children?: ReactNode }) {
  return (
    <section id="selection-guide" className="collection-guide" aria-labelledby="selection-guide-heading">
      <div className="reading-column">
        <h2 id="selection-guide-heading">{guide.title}</h2>
        <p className="guide-intro">{guide.description}</p>
        <ul className="guide-points">
          {guide.points.map((point) => (
            <li key={point.title}>
              <h3>{point.title}</h3>
              <p>{point.description}</p>
            </li>
          ))}
        </ul>
        {!!guide.officialLinks?.length && (
          <div className="guide-sources">
            <p>参考にした公式情報</p>
            <ul>
              {guide.officialLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
