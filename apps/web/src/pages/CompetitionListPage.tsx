import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GlitchButton } from '@task/ui';
import { Banner, EmptyState } from '../components/Banner';
import { StatusBadge } from '../components/Badge';
import { Panel } from '../components/Panel';
import { UserSelect } from '../components/UserSelect';
import { Field } from '../components/form/Field';
import { NeonInput } from '../components/form/NeonInput';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDate } from '../lib/format';
import type { Competition } from '../lib/types';

const PAGE_LINKS = [
  { to: (id: string) => `/competitions/${id}/team`, label: '团队' },
  { to: (id: string) => `/competitions/${id}/scoring`, label: '评分' },
  { to: (id: string) => `/competitions/${id}/peer-review`, label: '互评' },
  { to: (id: string) => `/competitions/${id}/results`, label: '结果' },
] as const;

export default function CompetitionListPage() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.globalRole === 'admin';

  const [list, setList] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await api<Competition[]>('/competitions'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载比赛列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl tracking-widest text-hi">比赛列表</h2>
      </div>

      {notice && <Banner kind="success">{notice}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      {isAdmin && <CreateCompetitionForm onCreated={load} onNotice={setNotice} />}

      {loading ? (
        <EmptyState text="加载中…" />
      ) : list.length === 0 ? (
        <EmptyState text="暂无比赛。管理员可在上方创建。" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <CompetitionCard
              key={c.id}
              competition={c}
              isAdmin={isAdmin}
              onChanged={load}
              onNotice={setNotice}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({
  competition: c,
  isAdmin,
  onChanged,
  onNotice,
}: {
  competition: Competition;
  isAdmin: boolean;
  onChanged: () => Promise<void>;
  onNotice: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const togglePublish = async () => {
    setBusy(true);
    try {
      await api(`/competitions/${c.id}/publish-dashboard`, {
        method: 'POST',
        body: JSON.stringify({ published: !c.dashboardPublished }),
      });
      onNotice(`大屏已${c.dashboardPublished ? '下线' : '发布'}`);
      await onChanged();
    } catch (e) {
      onNotice(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg tracking-wider text-hi">{c.name}</h3>
          <p className="mt-1 font-mono text-xs text-dim">截止 {fmtDate(c.submitDeadline)}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PAGE_LINKS.map((l) => (
          <Link
            key={l.label}
            to={l.to(c.id)}
            className="border border-cyan/30 px-3 py-1 font-mono text-sm text-cyan transition-colors hover:border-cyan"
          >
            {l.label}
          </Link>
        ))}
        {isAdmin && (
          <button
            type="button"
            disabled={busy}
            onClick={togglePublish}
            className={`border px-3 py-1 font-mono text-sm transition-colors disabled:opacity-40 ${
              c.dashboardPublished
                ? 'border-yellow/40 text-yellow hover:border-yellow'
                : 'border-success/40 text-success hover:border-success'
            }`}
          >
            {c.dashboardPublished ? '下线大屏' : '发布大屏'}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mt-3 border-t border-cyan/20 pt-3">
          <TeacherForm competitionId={c.id} onNotice={onNotice} />
        </div>
      )}
    </Panel>
  );
}

function CreateCompetitionForm({
  onCreated,
  onNotice,
}: {
  onCreated: () => Promise<void>;
  onNotice: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [peerReview, setPeerReview] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/competitions', {
        method: 'POST',
        body: JSON.stringify({
          name,
          submitDeadline: new Date(deadline).toISOString(),
          peerReviewEnabled: peerReview,
        }),
      });
      onNotice('比赛已创建');
      setName('');
      setDeadline('');
      await onCreated();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : '创建失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="创建比赛（管理员）">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
        <Field label="名称" required>
          <NeonInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="提交截止" required>
          <NeonInput
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </Field>
        <label className="flex items-end gap-2 pb-2 font-mono text-sm text-hi">
          <input
            type="checkbox"
            checked={peerReview}
            onChange={(e) => setPeerReview(e.target.checked)}
            className="h-4 w-4 accent-cyan"
          />
          开启互评
        </label>
        <div className="md:col-span-3">
          <GlitchButton type="submit" disabled={busy}>
            {busy ? '创建中…' : '创建比赛'}
          </GlitchButton>
        </div>
      </form>
    </Panel>
  );
}

function TeacherForm({
  competitionId,
  onNotice,
}: {
  competitionId: string;
  onNotice: (msg: string) => void;
}) {
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);

  const assign = async () => {
    if (!userId.trim()) return;
    setBusy(true);
    try {
      await api(`/competitions/${competitionId}/teachers`, {
        method: 'POST',
        body: JSON.stringify({ userId: userId.trim() }),
      });
      onNotice('已分配教师');
      setUserId('');
    } catch (e) {
      onNotice(e instanceof Error ? e.message : '分配失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!userId.trim()) return;
    setBusy(true);
    try {
      await api(`/competitions/${competitionId}/teachers/${userId.trim()}`, { method: 'DELETE' });
      onNotice('已移除教师');
      setUserId('');
    } catch (e) {
      onNotice(e instanceof Error ? e.message : '移除失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="分配教师" hint="仅列出 globalRole=teacher 的用户">
        <div className="flex gap-2">
          <UserSelect
            value={userId}
            onChange={setUserId}
            role="teacher"
            className="min-w-[260px]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={assign}
            className="border border-cyan/30 px-3 py-2 font-mono text-sm text-cyan hover:border-cyan disabled:opacity-40"
          >
            分配
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="border border-pink/30 px-3 py-2 font-mono text-sm text-pink hover:border-pink disabled:opacity-40"
          >
            移除
          </button>
        </div>
      </Field>
    </div>
  );
}
