import type { TickerItem } from '@task/contracts';

interface TickerProps {
  items: TickerItem[];
}

export function Ticker({ items }: TickerProps) {
  if (items.length === 0) {
    return <div className="p-2 font-mono text-sm text-dim">暂无公示评语</div>;
  }
  const joined = items.map((t) => `▸ ${t.text}`).join('   ');
  return (
    <div className="ticker overflow-hidden whitespace-nowrap">
      <span className="ticker-track inline-block font-mono text-sm text-base">{joined}</span>
    </div>
  );
}
