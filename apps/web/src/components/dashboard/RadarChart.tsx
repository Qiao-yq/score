import type { RadarResponse } from '@task/contracts';

interface RadarChartProps {
  data: RadarResponse;
}

const CX = 150;
const CY = 150;
const R = 118;
const RINGS = 4;

/** 六维平均分雷达图（纯 SVG，无第三方图表库）。 */
export function RadarChart({ data }: RadarChartProps) {
  const dims = data.dimensions;
  if (dims.length < 3) return <div className="p-4 font-mono text-sm text-dim">评分维度不足</div>;
  const n = dims.length;

  const point = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = R * ratio;
    return { x: CX + rr * Math.cos(angle), y: CY + rr * Math.sin(angle) };
  };

  const valuePts = dims.map((d, i) => point(i, Math.max(0, Math.min(100, d.avg)) / 100));
  const valuePolygon = valuePts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 300 300" className="h-full w-full">
      {Array.from({ length: RINGS }, (_, k) => {
        const ratio = (k + 1) / RINGS;
        const pts = dims.map((_, i) => point(i, ratio));
        return (
          <polygon
            key={k}
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#1a1633"
            strokeWidth={1}
          />
        );
      })}
      {dims.map((_, i) => {
        const p = point(i, 1);
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#1a1633" strokeWidth={1} />;
      })}
      <polygon points={valuePolygon} fill="rgba(0,243,255,0.12)" stroke="#00f3ff" strokeWidth={2} />
      {valuePts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#00f3ff" />
      ))}
      {dims.map((d, i) => {
        const p = point(i, 1.16);
        return (
          <text
            key={d.key}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="#c6cbe8"
            className="font-mono"
          >
            {d.label} {d.avg}
          </text>
        );
      })}
    </svg>
  );
}
