import type { CSSProperties } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

/** 赛博故障字（CSS ::before/::after 错位红青双影）。 */
export function GlitchText({ text, className }: GlitchTextProps) {
  return (
    <span
      className={`glitch-text ${className ?? ''}`}
      data-text={text}
      style={{ '--glitch-text': `"${text}"` } as CSSProperties}
    >
      {text}
    </span>
  );
}
