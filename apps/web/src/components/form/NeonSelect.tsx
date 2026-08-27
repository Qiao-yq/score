import type { SelectHTMLAttributes } from 'react';

/** 霓虹下拉选择。 */
export function NeonSelect({
  invalid,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...rest}
      className={`w-full border bg-void px-3 py-2 font-mono text-base text-hi outline-none focus:border-cyan ${
        invalid ? 'border-danger' : 'border-cyan/30'
      } ${className ?? ''}`}
    >
      {children}
    </select>
  );
}
