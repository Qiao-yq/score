import type { WordCloudItem } from '@task/contracts';

interface WordCloudProps {
  items: WordCloudItem[];
}

export function WordCloud({ items }: WordCloudProps) {
  if (items.length === 0) {
    return <div className="p-4 font-mono text-sm text-dim">暂无公示评语</div>;
  }
  const max = items[0]?.count ?? 1;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {items.map((w) => {
        const ratio = w.count / max;
        const size = 0.7 + ratio * 1.7;
        return (
          <span
            key={w.text}
            className="inline-block font-display uppercase tracking-wider text-cyan transition-transform hover:scale-110"
            style={{ fontSize: `${size}rem`, opacity: 0.35 + ratio * 0.65 }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}
