import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, StatusBadge } from '../components/Badge';
import { Banner, EmptyState } from '../components/Banner';
import { Panel } from '../components/Panel';
import { Field } from '../components/form/Field';
import { NeonSelect } from '../components/form/NeonSelect';
import { api } from '../lib/api';
import {
  COMMENT_SOURCE_LABELS,
  DIMENSION_LABELS,
  VISIBILITY_LABELS,
  fmtDate,
  fmtDecimal,
} from '../lib/format';
import type { Comment, ScoreDetail, Team } from '../lib/types';
import { useCompetition } from '../lib/useCompetition';

interface Evidence {
  id: string;
  evidenceId: string;
  dimension: string;
  materialType: string;
  locator: Record<string, unknown>;
  extractedAt: string;
  status: string;
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { myRole, loading, error } = useCompetition(id);

  if (loading) return <EmptyState text="加载中…" />;
  if (error) return <Banner kind="error">{error}</Banner>;
  if (!myRole) return <EmptyState text="无法获取角色信息" />;

  if (myRole.isAdmin || myRole.isTeacher) {
    return <StaffResults competitionId={id!} isStaff={true} />;
  }
  if (myRole.teamId) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl tracking-widest text-hi">本队结果</h2>
        <TeamResults teamId={myRole.teamId} isStaff={false} />
      </div>
    );
  }
  return <EmptyState text="你未加入任何团队，暂无结果可看" />;
}

function StaffResults({ competitionId, isStaff }: { competitionId: string; isStaff: boolean }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    api<Team[]>(`/competitions/${competitionId}/teams`)
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [competitionId]);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl tracking-widest text-hi">结果查看</h2>
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
      {teamId && <TeamResults teamId={teamId} isStaff={isStaff} />}
    </div>
  );
}

function TeamResults({ teamId, isStaff }: { teamId: string; isStaff: boolean }) {
  const [scores, setScores] = useState<ScoreDetail[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const tasks: Promise<unknown>[] = [
        api<ScoreDetail[]>(`/teams/${teamId}/scores`).then(setScores),
        api<Comment[]>(`/teams/${teamId}/comments`).then(setComments),
      ];
      if (isStaff) tasks.push(api<Evidence[]>(`/teams/${teamId}/evidence`).then(setEvidence));
      await Promise.all(tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载结果失败');
    }
  }, [teamId, isStaff]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Banner kind="error">{error}</Banner>;

  const latest = scores.length > 0 ? scores[scores.length - 1] : null;

  return (
    <div className="space-y-4">
      <Panel title="成绩">
        {latest ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={latest.status} />
              {latest.finalScore != null && (
                <span
                  className="font-display text-4xl text-cyan"
                  style={{ textShadow: '0 0 12px #00f3ff' }}
                >
                  {fmtDecimal(latest.finalScore)}
                </span>
              )}
              <span className="font-mono text-xs text-dim">
                互评 {fmtDecimal(latest.peerReviewScore)} · 版本 {latest.scoreVersion}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-dim">
                    <th className="py-1 pr-2 text-left">维度</th>
                    <th className="py-1 pr-2 text-left">Agent 分</th>
                    <th className="py-1 pr-2 text-left">教师分</th>
                    <th className="py-1 text-left">合成分</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.dimensions.map((d) => (
                    <tr key={d.dimensionKey} className="border-t border-cyan/10">
                      <td className="py-2 pr-2 text-hi">
                        {DIMENSION_LABELS[d.dimensionKey] ?? d.dimensionKey}
                      </td>
                      <td className="py-2 pr-2">{d.agentScore ?? '—'}</td>
                      <td className="py-2 pr-2">{d.teacherScore ?? '—'}</td>
                      <td className="py-2">{fmtDecimal(d.compositeScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState text="暂无评分" />
        )}
      </Panel>

      <Panel title="评语">
        {comments.length === 0 ? (
          <p className="font-mono text-xs text-dim">暂无评语</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="border-t border-cyan/10 pt-2">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-cyan">
                    {DIMENSION_LABELS[c.dimensionKey] ?? c.dimensionKey}
                  </span>
                  <Badge tone="dim">{COMMENT_SOURCE_LABELS[c.source] ?? c.source}</Badge>
                  <Badge tone="dim">{VISIBILITY_LABELS[c.visibility] ?? c.visibility}</Badge>
                  <span className="font-mono text-xs text-dim">{fmtDate(c.createdAt)}</span>
                </div>
                <p className="font-mono text-sm text-hi">
                  <span className="text-success">亮点：</span>
                  {c.highlight}
                </p>
                <p className="font-mono text-sm text-base">
                  <span className="text-yellow">建议：</span>
                  {c.suggestion}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {isStaff && (
        <Panel title="证据">
          {evidence.length === 0 ? (
            <p className="font-mono text-xs text-dim">暂无证据（Agent worker 未接入前为空）</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs text-base">
              {evidence.map((e) => (
                <li key={e.id}>
                  <span className="text-cyan">{e.evidenceId}</span> ·{' '}
                  {DIMENSION_LABELS[e.dimension] ?? e.dimension} · {e.materialType}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
