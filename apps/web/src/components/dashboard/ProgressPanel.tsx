import type { ProgressResponse } from '@task/contracts';

interface ProgressPanelProps {
  data: ProgressResponse;
}

export function ProgressPanel({ data }: ProgressPanelProps) {
  const pct = data.totalTeams > 0 ? Math.round((data.approvedTeams / data.totalTeams) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between font-mono text-sm">
        <span className="text-hi">评分进度</span>
        <span className="font-display text-lg text-cyan" style={{ textShadow: '0 0 8px #00f3ff' }}>
          {pct}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-sm border border-cyan/30 bg-deep">
        <div
          className="h-full bg-cyan transition-all duration-700"
          style={{ width: `${pct}%`, boxShadow: '0 0 12px #00f3ff' }}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-xs text-dim">
        <span>提交 {data.totalTeams}</span>
        <span>已评分 {data.scoredTeams}</span>
        <span>已发布 {data.approvedTeams}</span>
      </div>
    </div>
  );
}
