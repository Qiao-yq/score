import { useId } from 'react';

export interface NeonSliderProps {
  label: string;
  /** 0–100 整数 */
  value: number;
  onChange: (v: number) => void;
  accent?: 'cyan' | 'pink' | 'yellow';
  disabled?: boolean;
}

const ACCENT = {
  cyan: { fg: '#00f3ff', glow: '0 0 8px rgba(0,243,255,.6)' },
  pink: { fg: '#ff00aa', glow: '0 0 8px rgba(255,0,170,.6)' },
  yellow: { fg: '#fcee0a', glow: '0 0 8px rgba(252,238,10,.6)' },
} as const;

export function NeonSlider({ label, value, onChange, accent = 'cyan', disabled }: NeonSliderProps) {
  const id = useId();
  const c = ACCENT[accent];
  const pct = (value / 100) * 100;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between font-mono text-sm">
        <label htmlFor={id} className="tracking-wider text-hi">
          {label}
        </label>
        <span className="font-display text-lg" style={{ color: c.fg, textShadow: c.glow }}>
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="neon-range h-1.5 w-full cursor-pointer appearance-none rounded-sm outline-none"
        style={{
          color: c.fg,
          background: `linear-gradient(90deg, ${c.fg} ${pct}%, #1a1633 ${pct}%)`,
        }}
      />
    </div>
  );
}
