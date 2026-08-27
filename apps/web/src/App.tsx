import { useState } from 'react';
import { GlitchButton, NeonSlider } from '@task/ui';
import type { DimensionKey } from '@task/contracts';

const DIMS: { key: DimensionKey; label: string }[] = [
  { key: 'report_quality', label: '报告质量' },
  { key: 'interaction_visual', label: '交互视觉' },
  { key: 'function_experience', label: '功能体验' },
];

export default function App() {
  const [scores, setScores] = useState<Record<string, number>>({
    report_quality: 85,
    interaction_visual: 78,
    function_experience: 72,
  });

  return (
    <main className="min-h-screen bg-void font-body text-base">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10 border border-cyan/40 bg-deep/60 p-6 backdrop-blur">
          <h1 className="font-display text-3xl tracking-widest text-hi">
            TASK
            <span className="text-cyan" style={{ textShadow: '0 0 8px #00f3ff' }}>
              {' '}
              //
            </span>
            评分系统
          </h1>
          <p className="mt-2 font-mono text-sm text-dim">
            M2 工程脚手架 · React 18 + Vite + Tailwind + NestJS · 组件来自 @task/ui
          </p>
        </header>

        <section className="border border-cyan/40 bg-deep/60 p-6 backdrop-blur">
          <h2 className="mb-4 font-display text-lg text-hi">霓虹评分滑块（@task/ui）</h2>
          {DIMS.map((d) => (
            <div key={d.key} className="mb-4">
              <NeonSlider
                label={d.label}
                value={scores[d.key]}
                onChange={(v) => setScores((s) => ({ ...s, [d.key]: v }))}
              />
            </div>
          ))}
          <div className="mt-6 flex gap-4">
            <GlitchButton variant="primary">提交评分</GlitchButton>
            <GlitchButton variant="ghost">取消</GlitchButton>
          </div>
        </section>
      </div>
    </main>
  );
}
