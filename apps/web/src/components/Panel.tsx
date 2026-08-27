import type { ReactNode } from 'react';

/** 赛博面板卡片（与大屏 Panel 同款样式，业务页通用）。 */
export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-cyan/30 bg-deep/60 p-3 backdrop-blur ${className ?? ''}`}>
      {title && (
        <h3 className="mb-2 font-display text-xs uppercase tracking-[0.2em] text-cyan">{title}</h3>
      )}
      {children}
    </section>
  );
}
