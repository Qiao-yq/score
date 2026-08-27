import type { ReactNode } from 'react';

const KINDS = {
  error: 'border-danger/40 bg-danger/10 text-danger',
  success: 'border-success/40 bg-success/10 text-success',
  info: 'border-cyan/40 bg-cyan/10 text-cyan',
} as const;

/** 内联提示条（成功/错误/信息）。 */
export function Banner({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  return <div className={`mb-3 border px-3 py-2 font-mono text-sm ${KINDS[kind]}`}>{children}</div>;
}

/** 空态占位（无数据 / 无权限 / 加载失败）。 */
export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center border border-cyan/20 bg-deep/40 p-6 text-center">
      <p className="font-mono text-sm text-dim">{text}</p>
    </div>
  );
}
