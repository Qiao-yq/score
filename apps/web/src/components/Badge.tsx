import type { ReactNode } from 'react';

export type BadgeTone = 'cyan' | 'pink' | 'yellow' | 'success' | 'danger' | 'dim';

const TONES: Record<BadgeTone, string> = {
  cyan: 'border-cyan/40 bg-cyan/10 text-cyan',
  pink: 'border-pink/40 bg-pink/10 text-pink',
  yellow: 'border-yellow/40 bg-yellow/10 text-yellow',
  success: 'border-success/40 bg-success/10 text-success',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  dim: 'border-dim/40 bg-dim/10 text-dim',
};

export function Badge({ children, tone = 'dim' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2 py-0.5 font-mono text-xs ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** 各业务状态 → 中文标签 + 配色 */
const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  // 评分状态
  not_started: { label: '未开始', tone: 'dim' },
  processing: { label: '处理中', tone: 'cyan' },
  agent_scored: { label: 'Agent 已评分', tone: 'cyan' },
  needs_review: { label: '待复核', tone: 'yellow' },
  approved: { label: '已批准', tone: 'success' },
  published: { label: '已发布', tone: 'success' },
  // 团队状态
  draft: { label: '草稿', tone: 'dim' },
  submitted: { label: '已提交', tone: 'cyan' },
  locked: { label: '已锁定', tone: 'yellow' },
  // 互评状态
  suspicious: { label: '可疑', tone: 'danger' },
  valid: { label: '有效', tone: 'success' },
  invalid: { label: '作废', tone: 'danger' },
  // 映射状态
  active: { label: '进行中', tone: 'cyan' },
  closed: { label: '已关闭', tone: 'dim' },
};

/** 通用状态徽章：命中已知状态则映射中文+配色，否则原样展示。 */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="dim">—</Badge>;
  const m = STATUS_MAP[status];
  if (!m) return <Badge tone="dim">{status}</Badge>;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
