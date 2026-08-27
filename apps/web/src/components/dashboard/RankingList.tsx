import type { RankingItem } from '@task/contracts';

interface RankingListProps {
  items: RankingItem[];
}

export function RankingList({ items }: RankingListProps) {
  if (items.length === 0) {
    return <div className="p-4 font-mono text-sm text-dim">暂无已发布评分</div>;
  }
  return (
    <div className="max-h-full overflow-auto">
      <table className="w-full text-left font-mono text-sm">
        <thead className="sticky top-0 bg-deep text-dim">
          <tr className="border-b border-cyan/20">
            <th className="px-2 py-1 font-normal">#</th>
            <th className="px-2 py-1 font-normal">团队</th>
            <th className="px-2 py-1 font-normal">项目</th>
            <th className="px-2 py-1 text-right font-normal">最终分</th>
            <th className="px-2 py-1 text-right font-normal">趋势</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.teamId} className="border-b border-white/5 hover:bg-cyan/5">
              <td className="px-2 py-1 text-cyan">{t.rank}</td>
              <td className="px-2 py-1 text-hi">{t.name}</td>
              <td className="max-w-[180px] truncate px-2 py-1 text-base">{t.projectName}</td>
              <td className="px-2 py-1 text-right text-hi">{t.finalScore.toFixed(1)}</td>
              <td className="px-2 py-1 text-right">
                {t.delta > 0 ? (
                  <span className="text-success">▲{t.delta}</span>
                ) : t.delta < 0 ? (
                  <span className="text-danger">▼{Math.abs(t.delta)}</span>
                ) : (
                  <span className="text-dim">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
