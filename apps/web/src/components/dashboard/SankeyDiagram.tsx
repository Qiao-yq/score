import type { SankeyResponse } from '@task/contracts';

interface SankeyDiagramProps {
  data: SankeyResponse;
}

const NODE_H = 32;
const GAP = 16;
const X0 = 170;
const X1 = 470;
const W = 640;

/** 互评映射桑基图（仅管理员）：左列 reviewer → 右列 target（匿名编号）。 */
export function SankeyDiagram({ data }: SankeyDiagramProps) {
  const { nodes, links } = data;
  if (nodes.length === 0 || links.length === 0) {
    return <div className="p-4 font-mono text-sm text-dim">暂无互评映射</div>;
  }

  const labelOf = new Map(nodes.map((n) => [n.id, n.label]));
  const targetRow = (id: string) => links.findIndex((l) => l.target === id);
  const row = (i: number) => GAP + i * (NODE_H + GAP) + NODE_H / 2;
  const H = Math.max(links.length, 1) * (NODE_H + GAP) + GAP;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <defs>
        <marker id="sankey-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#ff00aa" />
        </marker>
      </defs>
      {links.map((l, i) => {
        const y0 = row(i);
        const y1 = row(targetRow(l.target));
        const mx = (X0 + X1) / 2;
        return (
          <path
            key={i}
            d={`M ${X0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${X1} ${y1}`}
            fill="none"
            stroke="#ff00aa"
            strokeWidth={2}
            strokeOpacity={0.5}
            markerEnd="url(#sankey-arrow)"
          />
        );
      })}
      {links.map((l, i) => (
        <g key={`r-${l.source}`}>
          <rect
            x={X0 - 130}
            y={row(i) - NODE_H / 2}
            width={130}
            height={NODE_H}
            fill="#120c24"
            stroke="#00f3ff"
            strokeWidth={1}
          />
          <text
            x={X0 - 65}
            y={row(i)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="#c6cbe8"
            className="font-mono"
          >
            {labelOf.get(l.source) ?? l.source}
          </text>
        </g>
      ))}
      {links.map((l) => {
        const i = targetRow(l.target);
        return (
          <g key={`t-${l.target}`}>
            <rect
              x={X1}
              y={row(i) - NODE_H / 2}
              width={130}
              height={NODE_H}
              fill="#120c24"
              stroke="#ff00aa"
              strokeWidth={1}
            />
            <text
              x={X1 + 65}
              y={row(i)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fill="#c6cbe8"
              className="font-mono"
            >
              {labelOf.get(l.target) ?? l.target}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
