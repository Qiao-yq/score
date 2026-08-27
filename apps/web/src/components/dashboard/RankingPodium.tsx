import type { RankingItem } from '@task/contracts';

interface RankingPodiumProps {
  items: RankingItem[];
}

const ACCENTS = ['#fcee0a', '#00f3ff', '#ff00aa'];
const HEIGHTS = [0, 104, 76, 54];
/** 展示顺序：亚军（左）、冠军（中）、季军（右） */
const ORDER = [1, 0, 2];

export function RankingPodium({ items }: RankingPodiumProps) {
  const top = items.slice(0, 3);
  const rows = ORDER.map((i) => top[i]).filter((x): x is RankingItem => Boolean(x));

  return (
    <div className="flex items-end justify-center gap-4">
      {rows.map((item) => {
        const accent = ACCENTS[item.rank - 1] ?? '#00f3ff';
        const h = HEIGHTS[item.rank] ?? 54;
        return (
          <div key={item.teamId} className="flex w-36 flex-col items-center">
            <div className="mb-2 text-center">
              <div
                className="font-display text-2xl font-bold tracking-wider"
                style={{ color: accent, textShadow: `0 0 12px ${accent}` }}
              >
                {item.rank === 1 ? 'NO.1' : `NO.${item.rank}`}
              </div>
              <div className="font-mono text-xs text-dim">{item.finalScore.toFixed(1)} 分</div>
            </div>
            <div className="max-w-full truncate px-2 text-center font-display text-sm uppercase tracking-wider text-hi">
              {item.name}
            </div>
            <div className="max-w-full truncate px-2 text-center font-mono text-[11px] text-dim">
              {item.projectName}
            </div>
            <div
              className="mt-2 w-full border-t-2 bg-deep/60"
              style={{ height: `${h}px`, borderColor: accent, boxShadow: `0 0 18px ${accent}66` }}
            />
          </div>
        );
      })}
    </div>
  );
}
