import type { InputHTMLAttributes } from 'react';

/** 霓虹输入框（沿用 LoginPage 输入框样式，支持 invalid 错误态）。 */
export function NeonInput({
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      className={`w-full border bg-void px-3 py-2 font-mono text-base text-hi outline-none focus:border-cyan ${
        invalid ? 'border-danger' : 'border-cyan/30'
      } ${className ?? ''}`}
    />
  );
}
