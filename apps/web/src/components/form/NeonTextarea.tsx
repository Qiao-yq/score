import type { TextareaHTMLAttributes } from 'react';

/** 霓虹多行文本（同 NeonInput 样式）。 */
export function NeonTextarea({
  invalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      className={`w-full border bg-void px-3 py-2 font-mono text-base text-hi outline-none focus:border-cyan ${
        invalid ? 'border-danger' : 'border-cyan/30'
      } ${className ?? ''}`}
    />
  );
}
