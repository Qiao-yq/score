import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GlitchButton, NeonSlider } from '@task/ui';
import { Badge, StatusBadge } from '../components/Badge';
import { Banner, EmptyState } from '../components/Banner';
import { Panel } from '../components/Panel';
import { Field } from '../components/form/Field';
import { NeonInput } from '../components/form/NeonInput';
import { NeonSelect } from '../components/form/NeonSelect';
import { NeonTextarea } from '../components/form/NeonTextarea';
import { api } from '../lib/api';
import {
  AGENT_DIMENSIONS,
  DIMENSION_LABELS,
  RISK_FLAG_LABELS,
  TEACHER_ACTION_LABELS,
  fmtConfidence,
  fmtDate,
  fmtDecimal,
} from '../lib/format';
import type { ScoreDetail, Team } from '../lib/types';
import { useCompetition } from '../lib/useCompetition';

interface DimEntry {
  agentScore: number;
  agentConfidence: number;
  highlight: string;
  suggestion: string;
  evidenceIds: string;
}

function emptyEntry(): DimEntry {
  return { agentScore: 80, agentConfidence: 0.85, highlight: '', suggestion: '', evidenceIds: '' };
}

export default function ScoringPage() {
  const { id } = useParams<{ id: string }>();
  const { myRole, loading, error } = useCompetition(id);

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Team[]>(`/competitions/${id}/teams`)
      .then(setTeams)
      .catch((e) => setTeamsError(e instanceof Error ? e.message : '加载团队失败'));
  }, [id]);

  if (loading) return <EmptyState text="加载中…" />;
  if (error) return <Banner kind="error">{error}</Banner>;
  if (!myRole || (!myRole.isAdmin && !myRole.isTeacher)) {
    return <EmptyState text="无评分权限（仅教师/管理员）" />;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl tracking-widest text-hi">评分工作台</h2>
      {teamsError && <Banner kind="error">{teamsError}</Banner>}
      {teams.length === 0 ? (
        <EmptyState text="暂无团队" />
      ) : (
        <>
          <Field label="选择团队">
            <NeonSelect value={teamId ?? ''} onChange={(e) => setTeamId(e.target.value || null)}>
              <option value="">— 选择团队 —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.projectName}
                </option>
              ))}
            </NeonSelect>
          </Field>
          {teamId && <ScoreWorkspace teamId={teamId} isAdmin={myRole.isAdmin} />}
        </>
      )}
    </div>
  );
}

function ScoreWorkspace({ teamId, isAdmin }: { teamId: string; isAdmin: boolean }) {
  const [scores, setScores] = useState<ScoreDetail[]>([]);
  const [status, setStatus] = useState<string>('not_started');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showEntry, setShowEntry] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, st] = await Promise.all([
        api<ScoreDetail[]>(`/teams/${teamId}/scores`),
        api<{ status: string }>(`/teams/${teamId}/score/status`),
      ]);
      setScores(list);
      setStatus(st.status);
      if (list.length > 0) {
        setSelectedVersion((cur) => cur ?? list[list.length - 1].scoreVersion);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载评分失败');
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = scores.find((s) => s.scoreVersion === selectedVersion) ?? null;

  const trigger = async () => {
    setNotice(null);
    try {
      await api(`/teams/${teamId}/score`, { method: 'POST' });
      setNotice('已触发评分（M3 受理桩，需手动录入结果回填）');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '触发失败');
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="评分状态">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <button
            type="button"
            onClick={trigger}
            className="border border-cyan/30 px-3 py-1 font-mono text-sm text-cyan hover:border-cyan"
          >
            触发评分
          </button>
          <button
            type="button"
            onClick={() => setShowEntry((v) => !v)}
            className="border border-pink/30 px-3 py-1 font-mono text-sm text-pink hover:border-pink"
          >
            {showEntry ? '收起录入' : '手动录入 Agent 结果'}
          </button>
          <span className="font-mono text-xs text-dim">
            真实 Agent worker 未接入，出分需手动录入
          </span>
        </div>
      </Panel>

      {notice && <Banner kind="info">{notice}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      {showEntry && (
        <ManualAgentEntry
          teamId={teamId}
          onSaved={() => {
            setShowEntry(false);
            void load();
          }}
        />
      )}

      <Panel title="评分版本">
        {scores.length === 0 ? (
          <EmptyState text="暂无评分版本，请先录入 Agent 结果" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {scores.map((s) => (
              <button
                key={s.scoreVersion}
                type="button"
                onClick={() => setSelectedVersion(s.scoreVersion)}
                className={`border px-3 py-1 font-mono text-sm transition-colors ${
                  s.scoreVersion === selectedVersion
                    ? 'border-cyan bg-cyan/10 text-cyan'
                    : 'border-cyan/30 text-hi hover:border-cyan'
                }`}
              >
                {s.scoreVersion} <StatusBadge status={s.status} />
              </button>
            ))}
          </div>
        )}
      </Panel>

      {selected && (
        <ScoreDetailView
          key={selected.scoreVersion}
          score={selected}
          teamId={teamId}
          isAdmin={isAdmin}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

function ManualAgentEntry({ teamId, onSaved }: { teamId: string; onSaved: () => void }) {
  const [entries, setEntries] = useState<Record<string, DimEntry>>(() => {
    const m: Record<string, DimEntry> = {};
    for (const d of AGENT_DIMENSIONS) m[d.key] = emptyEntry();
    return m;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, patch: Partial<DimEntry>) =>
    setEntries((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const dimensions = AGENT_DIMENSIONS.map((d) => {
      const en = entries[d.key];
      return {
        dimensionKey: d.key,
        agentScore: en.agentScore,
        agentConfidence: en.agentConfidence,
        evidenceIds: en.evidenceIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        highlight: en.highlight,
        suggestion: en.suggestion,
      };
    });

    const invalid = dimensions.some(
      (d) => d.highlight.trim().length < 10 || d.suggestion.trim().length < 10,
    );
    if (invalid) {
      setError('每个维度的亮点与建议均需 ≥10 字');
      setBusy(false);
      return;
    }

    try {
      await api(`/teams/${teamId}/score/agent-result`, {
        method: 'POST',
        body: JSON.stringify({ dimensions }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '录入失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="手动录入 Agent 结果（5 个判断维度）">
      {error && <Banner kind="error">{error}</Banner>}
      <p className="mb-3 font-mono text-xs text-dim">
        提交速度由系统注入、互评由算法计算，无需录入。证据 id 当前无写入入口，可留空。
      </p>
      <form onSubmit={submit} className="space-y-4">
        {AGENT_DIMENSIONS.map((d) => {
          const en = entries[d.key];
          return (
            <div key={d.key} className="border border-cyan/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-display text-sm tracking-wider text-cyan">
                  {d.label} <span className="font-mono text-xs text-dim">权重 {d.weight}%</span>
                </h4>
                <span className="font-mono text-xs text-dim">
                  置信度 {fmtConfidence(en.agentConfidence)}
                </span>
              </div>
              <NeonSlider
                label="Agent 分"
                value={en.agentScore}
                onChange={(v) => set(d.key, { agentScore: v })}
              />
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <Field label="置信度 0–1">
                  <NeonInput
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={en.agentConfidence}
                    onChange={(e) => set(d.key, { agentConfidence: Number(e.target.value) })}
                  />
                </Field>
                <Field label="证据 id（逗号分隔，可空）">
                  <NeonInput
                    value={en.evidenceIds}
                    onChange={(e) => set(d.key, { evidenceIds: e.target.value })}
                    placeholder="evidence-1,evidence-2"
                  />
                </Field>
                <Field label="亮点（≥10 字）">
                  <NeonTextarea
                    rows={2}
                    value={en.highlight}
                    onChange={(e) => set(d.key, { highlight: e.target.value })}
                  />
                </Field>
                <Field label="改进建议（≥10 字）">
                  <NeonTextarea
                    rows={2}
                    value={en.suggestion}
                    onChange={(e) => set(d.key, { suggestion: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          );
        })}
        <GlitchButton type="submit" disabled={busy}>
          {busy ? '录入中…' : '保存 Agent 结果'}
        </GlitchButton>
      </form>
    </Panel>
  );
}

function ScoreDetailView({
  score,
  teamId,
  isAdmin,
  onChanged,
}: {
  score: ScoreDetail;
  teamId: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [reviews, setReviews] = useState<
    Record<string, { action: string; score: number; reason: string }>
  >(() => {
    const m: Record<string, { action: string; score: number; reason: string }> = {};
    for (const d of score.dimensions) {
      m[d.dimensionKey] = { action: 'approve', score: d.agentScore ?? 0, reason: '' };
    }
    return m;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const setReview = (
    key: string,
    patch: Partial<{ action: string; score: number; reason: string }>,
  ) => setReviews((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const submitReview = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const dimensionReviews = score.dimensions
      .filter((d) => d.dimensionKey !== 'submit_speed')
      .map((d) => {
        const r = reviews[d.dimensionKey] ?? {
          action: 'approve',
          score: d.agentScore ?? 0,
          reason: '',
        };
        const base: { dimensionKey: string; action: string; score?: number; reason?: string } = {
          dimensionKey: d.dimensionKey,
          action: r.action,
        };
        if (r.action === 'suggest_modify') {
          base.score = r.score;
          base.reason = r.reason;
        } else if (r.action === 'insufficient') {
          base.reason = r.reason;
        }
        return base;
      });
    try {
      await api(`/teams/${teamId}/scores/${score.scoreVersion}/review`, {
        method: 'POST',
        body: JSON.stringify({ dimensionReviews }),
      });
      setNotice('复核已保存');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : '复核失败');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/teams/${teamId}/scores/${score.scoreVersion}/approve`, { method: 'POST' });
      setNotice('已批准并生成最终分');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : '批准失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={`版本 ${score.scoreVersion} · ${score.rubricVersion}`}>
      {notice && <Banner kind="success">{notice}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <StatusBadge status={score.status} />
        {score.finalScore != null && (
          <span
            className="font-display text-2xl text-cyan"
            style={{ textShadow: '0 0 8px #00f3ff' }}
          >
            {fmtDecimal(score.finalScore)}
          </span>
        )}
        <span className="font-mono text-xs text-dim">
          互评 {fmtDecimal(score.peerReviewScore)} · 生成 {fmtDate(score.generatedAt)}
        </span>
        {score.riskFlags.map((f) => (
          <Badge key={f} tone="yellow">
            {RISK_FLAG_LABELS[f] ?? f}
          </Badge>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-dim">
              <th className="py-1 pr-2">维度</th>
              <th className="py-1 pr-2">Agent 分</th>
              <th className="py-1 pr-2">置信度</th>
              <th className="py-1 pr-2">教师分</th>
              <th className="py-1 pr-2">合成分</th>
              <th className="py-1">复核动作</th>
            </tr>
          </thead>
          <tbody>
            {score.dimensions.map((d) => {
              const r = reviews[d.dimensionKey];
              return (
                <tr key={d.dimensionKey} className="border-t border-cyan/10">
                  <td className="py-2 pr-2 text-hi">
                    {DIMENSION_LABELS[d.dimensionKey] ?? d.dimensionKey}
                  </td>
                  <td className="py-2 pr-2">{d.agentScore ?? '—'}</td>
                  <td className="py-2 pr-2">{fmtConfidence(d.agentConfidence)}</td>
                  <td className="py-2 pr-2">{d.teacherScore ?? '—'}</td>
                  <td className="py-2 pr-2">{fmtDecimal(d.compositeScore)}</td>
                  <td className="py-2">
                    {d.dimensionKey === 'submit_speed' ? (
                      <span className="text-dim">系统注入</span>
                    ) : (
                      <select
                        value={r?.action ?? 'approve'}
                        onChange={(e) => setReview(d.dimensionKey, { action: e.target.value })}
                        className="border border-cyan/30 bg-void px-2 py-1 font-mono text-sm text-hi outline-none focus:border-cyan"
                      >
                        <option value="approve">{TEACHER_ACTION_LABELS.approve}</option>
                        <option value="suggest_modify">
                          {TEACHER_ACTION_LABELS.suggest_modify}
                        </option>
                        <option value="insufficient">{TEACHER_ACTION_LABELS.insufficient}</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 复核编辑区 */}
      <div className="mt-3 space-y-3 border-t border-cyan/20 pt-3">
        {score.dimensions
          .filter((d) => d.dimensionKey !== 'submit_speed')
          .map((d) => {
            const r = reviews[d.dimensionKey];
            if (!r || r.action === 'approve') return null;
            return (
              <div key={d.dimensionKey} className="flex flex-wrap items-end gap-2">
                <span className="font-mono text-xs text-cyan">
                  {DIMENSION_LABELS[d.dimensionKey]}
                </span>
                {r.action === 'suggest_modify' && (
                  <Field label="教师分">
                    <NeonInput
                      type="number"
                      min={0}
                      max={100}
                      value={r.score}
                      onChange={(e) => setReview(d.dimensionKey, { score: Number(e.target.value) })}
                    />
                  </Field>
                )}
                <Field label="原因（≥10 字）">
                  <NeonInput
                    value={r.reason}
                    onChange={(e) => setReview(d.dimensionKey, { reason: e.target.value })}
                    placeholder="说明原因"
                    className="min-w-[280px]"
                  />
                </Field>
              </div>
            );
          })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <GlitchButton variant="ghost" disabled={busy} onClick={submitReview}>
          保存复核
        </GlitchButton>
        {isAdmin && (
          <GlitchButton disabled={busy} onClick={approve}>
            批准并计算最终分
          </GlitchButton>
        )}
      </div>
    </Panel>
  );
}
