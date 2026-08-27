import type { ReactNode } from 'react';

/** 表单字段包装：标签 + 控件 + 错误/提示。 */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-dim">
          {label}
          {required && <span className="text-pink"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 font-mono text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 font-mono text-xs text-dim">{hint}</p>
      ) : null}
    </div>
  );
}
