import type { ReactNode } from 'react';

export interface GlitchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
}

const VARIANTS = {
  primary: 'bg-cyan text-void',
  danger: 'bg-pink text-void',
  ghost: 'border border-cyan bg-transparent text-cyan',
} as const;

export function GlitchButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
}: GlitchButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`glitch-btn relative overflow-hidden px-5 py-2 font-display uppercase tracking-widest transition-transform active:scale-95 disabled:opacity-40 ${VARIANTS[variant]}`}
    >
      <span aria-hidden className="glitch-sweep" />
      {children}
    </button>
  );
}
