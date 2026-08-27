import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GlitchButton, NeonSlider } from '@task/ui';
import type { AnonymousTarget } from '@task/contracts';
import { StatusBadge } from '../components/Badge';
import { Banner, EmptyState } from '../components/Banner';
import { Panel } from '../components/Panel';
import { NeonInput } from '../components/form/NeonInput';
import { api, ApiException } from '../lib/api';
import { fmtDate } from '../lib/format';
import type { PeerAudit, Team } from '../lib/types';
import { useCompetition } from '../lib/useCompetition';

export default function PeerReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { myRole, loading, error } = useCompetition(id);

  if (loading) return <EmptyState text="加载中…" />;
  if (error) return <Banner kind="error">{error}</Banner>;
  if (!myRole) return <EmptyState text="无法获取角色信息" />;

  if (myRole.isAdmin) return <AdminView competitionId={id!} />;
  if (myRole.teamRole === 'captain') return <CaptainView competitionId={id!} />;
  return <EmptyState text="仅队长可参与互评，管理员可管理映射" />;
}

function CaptainView({ competitionId }: { competitionId: string }) {
  const [target, setTarget] = useState<AnonymousTarget | null>(null);
  const [score, setScore] = useState(80);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTarget(await api<AnonymousTarget>(`/competitions/${competitionId}/peer-review/my-target`));
    } catch (e) {
      if (e instanceof ApiException && e.body.code === 'PEER_NOT_OPEN') {
        setError('互评尚未开启或你未被分配对象，请联系管理员生成映射');
      } else {
        setError(e instanceof Error ? e.message : '加载失败');
      }
    }
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await api(`/competitions/${competitionId}/peer-review/submit`, {
        method: 'POST',
        body: JSON.stringify({ score }),
      });
      setNotice('互评已提交');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl tracking-widest text-hi">团队互评</h2>
      {notice && <Banner kind="success">{notice}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      {target ? (
        <Panel title={`被分配对象 · ${target.targetRef}`}>
          <div className="space-y-2 font-mono text-sm text-base">
            <div>
              <span className="text-dim">项目：</span>
              <span className="text-hi">{target.projectName}</span>
            </div>
            {target.projectDescription && <p className="text-dim">{target.projectDescription}</p>}
            <div className="flex flex-wrap gap-4 text-xs">
              {target.reportUrl && (
                <a
                  href={target.reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan underline"
                >
                  报告链接
                </a>
              )}
              {target.prototypeUrl && (
                <a
                  href={target.prototypeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan underline"
                >
                  原型链接
                </a>
              )}
              {target.videoUrl && (
                <a
                  href={target.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan underline"
                >
                  演示视频
                </a>
              )}
            </div>
          </div>

          <div className="mt-4">
            {target.alreadySubmitted ? (
              <Banner kind="info">你已提交过互评（单次提交，不可重复）</Banner>
            ) : (
              <>
                <NeonSlider label="综合互评分" value={score} onChange={setScore} accent="pink" />
                <div className="mt-3">
                  <GlitchButton variant="danger" disabled={busy} onClick={submit}>
                    {busy ? '提交中…' : '提交互评'}
                  </GlitchButton>
                </div>
              </>
            )}
          </div>
        </Panel>
      ) : (
        !error && <EmptyState text="加载被分配对象中…" />
      )}
    </div>
  );
}

function AdminView({ competitionId }: { competitionId: string }) {
  const [audit, setAudit] = useState<PeerAudit | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, t] = await Promise.all([
        api<PeerAudit>(`/competitions/${competitionId}/peer-review/audit`),
        api<Team[]>(`/competitions/${competitionId}/teams`),
      ]);
      setAudit(a);
      setTeams(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameOf = (id: string) => {
    const t = teams.find((x) => x.id === id);
    return t ? t.name : id.slice(0, 8);
  };

  const generate = async () => {
    setNotice(null);
    try {
      await api(`/competitions/${competitionId}/peer-review/generate-mapping`, { method: 'POST' });
      setNotice('已生成/重生成映射');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '生成失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl tracking-widest text-hi">互评管理（管理员）</h2>
        <GlitchButton onClick={generate}>生成/重生成映射</GlitchButton>
      </div>
      {notice && <Banner kind="info">{notice}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      {audit && (
        <>
          <Panel title="当前映射">
            {audit.mappings.length === 0 ? (
              <p className="font-mono text-xs text-dim">暂无映射，点击上方生成</p>
            ) : (
              <ul className="space-y-1 font-mono text-sm text-base">
                {audit.mappings
                  .filter((m) => m.status === 'active')
                  .flatMap((m) => m.edges)
                  .map((e, i) => (
                    <li key={i}>
                      <span className="text-cyan">{nameOf(e.reviewerTeamId)}</span>
                      <span className="text-dim"> → </span>
                      <span className="text-pink">{nameOf(e.targetTeamId)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>

          <Panel title="互评记录">
            {audit.reviews.length === 0 ? (
              <p className="font-mono text-xs text-dim">暂无提交</p>
            ) : (
              <div className="space-y-2">
                {audit.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 border-t border-cyan/10 pt-2"
                  >
                    <span className="font-mono text-sm text-hi">
                      {nameOf(r.reviewerTeamId)} → {nameOf(r.targetTeamId)}
                    </span>
                    <span className="font-mono text-sm text-hi">分 {r.score ?? '—'}</span>
                    <StatusBadge status={r.status} />
                    {r.anomalyReasons.length > 0 && (
                      <span className="font-mono text-xs text-danger">
                        {r.anomalyReasons.join('、')}
                      </span>
                    )}
                    <span className="font-mono text-xs text-dim">{fmtDate(r.submittedAt)}</span>
                    {r.status === 'suspicious' && (
                      <ResolveActions competitionId={competitionId} reviewId={r.id} onDone={load} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function ResolveActions({
  competitionId,
  reviewId,
  onDone,
}: {
  competitionId: string;
  reviewId: string;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const resolve = async (action: 'valid' | 'invalid') => {
    if (reason.trim().length < 10) return;
    setBusy(true);
    try {
      await api(`/competitions/${competitionId}/peer-review/${reviewId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      setReason('');
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <NeonInput
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="处理原因（≥10 字）"
        className="min-w-[220px]"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void resolve('valid')}
        className="border border-success/40 px-3 py-2 font-mono text-sm text-success hover:border-success disabled:opacity-40"
      >
        确认有效
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void resolve('invalid')}
        className="border border-danger/40 px-3 py-2 font-mono text-sm text-danger hover:border-danger disabled:opacity-40"
      >
        作废
      </button>
    </div>
  );
}
