import { useEffect, useRef } from 'react';

interface CodeRainProps {
  active: boolean;
}

const CHARS = 'アイウエオカキクケコサシスセソタチツテト01<>[]{}/\\|=+-*$';

/** 数字雨背景（canvas，~16fps 降负载；仅在动效 full 时渲染）。 */
export function CodeRain({ active }: CodeRainProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const fontSize = 14;
    let columns = 0;
    let drops: number[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(w / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * (-h / fontSize));
    };
    resize();
    window.addEventListener('resize', resize);

    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 66) return;
      last = t;
      ctx.fillStyle = 'rgba(10, 10, 15, 0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      for (let i = 0; i < columns; i++) {
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillStyle = Math.random() > 0.975 ? '#00f3ff' : 'rgba(0,243,255,0.5)';
        ctx.fillText(ch, x, y);
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-20" />
  );
}
