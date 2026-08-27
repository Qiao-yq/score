import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GlitchButton } from '@task/ui';
import { Banner, EmptyState } from '../components/Banner';
import { StatusBadge } from '../components/Badge';
import { Panel } from '../components/Panel';
import { UserSelect } from '../components/UserSelect';
import { Field } from '../components/form/Field';
import { NeonInput } from '../components/form/NeonInput';
import { NeonSelect } from '../components/form/NeonSelect';
import { NeonTextarea } from '../components/form/NeonTextarea';
import { api } from '../lib/api';
import { ATTACHMENT_TYPE_LABELS, fmtBytes, fmtDate } from '../lib/format';
import type { Team } from '../lib/types';
import { useCompetition } from '../lib/useCompetition';

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const { competition, myRole, loading, error } = useCompetition(id);

  if (loading) return <EmptyState text="加载中…" />;
  if (error) return <Banner kind="error">{error}</Banner>;
  if (!myRole) return <EmptyState text="无法获取角色信息" />;

  // 管理员/教师：查看全部团队 + 管理员解锁
  if (myRole.isAdmin || myRole.isTeacher) {
    return <StaffTeamList competitionId={id!} isAdmin={myRole.isAdmin} />;
  }

  // 队员：有团队 → 团队管理；无团队 → 创建
  if (myRole.teamId) {
    return <MyTeam teamId={myRole.teamId} isCaptain={myRole.teamRole === 'captain'} />;
  }

  return (
    <CreateTeam
      competitionId={id!}
      deadline={competition?.submitDeadline ?? null}
      onCreated={() => window.location.reload()}
    />
  );
}

/** 管理员/教师视图：团队列表 + 管理员解锁 */
function StaffTeamList({ competitionId, isAdmin }: { competitionId: string; isAdmin: boolean }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Team[]>(`/competitions/${competitionId}/teams`)
      .then(setTeams)
      .catch((e) => setError(e instanceof Error ? e.message : '加载团队失败'));
  }, [competitionId]);

  if (error) return <Banner kind="error">{error}</Banner>;
  if (teams.length === 0) return <EmptyState text="暂无团队" />;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl tracking-widest text-hi">团队列表</h2>
      {teams.map((t) => (
        <Panel key={t.id}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg tracking-wider text-hi">{t.name}</h3>
              <p className="mt-1 font-mono text-xs text-dim">
                {t.projectName} · {t.members?.length ?? 0} 名成员
              </p>
            </div>
            <StatusBadge status={t.status} />
          </div>
          {isAdmin && t.status !== 'draft' && (
            <div className="mt-3 border-t border-cyan/20 pt-3">
              <UnlockForm teamId={t.id} />
            </div>
          )}
        </Panel>
      ))}
    </div>
  );
}

function UnlockForm({ teamId }: { teamId: string }) {
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = async () => {
    if (reason.trim().length < 1) return;
    setBusy(true);
    try {
      await api(`/teams/${teamId}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setNotice('已解锁');
      setReason('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '解锁失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {notice && <Banner kind={notice.startsWith('已') ? 'success' : 'error'}>{notice}</Banner>}
      <Field label="解锁原因" required>
        <div className="flex gap-2">
          <NeonInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="解锁原因（必填）"
          />
          <GlitchButton variant="ghost" disabled={busy} onClick={unlock}>
            解锁
          </GlitchButton>
        </div>
      </Field>
    </div>
  );
}

/** 队长/成员：本队资料管理 */
function MyTeam({ teamId, isCaptain }: { teamId: string; isCaptain: boolean }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTeam(await api<Team>(`/teams/${teamId}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载团队失败');
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Banner kind="error">{error}</Banner>;
  if (!team) return <EmptyState text="加载中…" />;

  const locked = team.status !== 'draft';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl tracking-widest text-hi">{team.name}</h2>
        <StatusBadge status={team.status} />
      </div>
      {team.submittedAt && (
        <p className="font-mono text-xs text-dim">提交时间 {fmtDate(team.submittedAt)}</p>
      )}
      {notice && <Banner kind="success">{notice}</Banner>}

      <EditTeamForm
        team={team}
        disabled={!isCaptain || locked}
        onSaved={(msg) => {
          setNotice(msg);
          void load();
        }}
      />

      <Panel title="成员">
        <ul className="space-y-1 font-mono text-sm text-base">
          {team.members?.map((m) => (
            <li key={m.id} className="flex justify-between">
              <span>{m.user.name ?? m.user.email ?? m.userId}</span>
              <span className={m.role === 'captain' ? 'text-cyan' : 'text-dim'}>
                {m.role === 'captain' ? '队长' : '成员'}
              </span>
            </li>
          ))}
        </ul>
        {isCaptain && !locked && (
          <AddMember
            teamId={teamId}
            excludeIds={team.members?.map((m) => m.userId) ?? []}
            onAdded={load}
          />
        )}
      </Panel>

      <Panel title="附件">
        {team.attachments?.length ? (
          <ul className="space-y-1 font-mono text-xs text-base">
            {team.attachments.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>
                  {ATTACHMENT_TYPE_LABELS[a.type] ?? a.type} · {a.fileName}
                </span>
                <span className="text-dim">{fmtBytes(a.sizeBytes)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-xs text-dim">暂无附件</p>
        )}
        {isCaptain && !locked && <RegisterAttachment teamId={teamId} onAdded={load} />}
      </Panel>

      {isCaptain && !locked && <SubmitTeam teamId={teamId} onSubmitted={load} />}
    </div>
  );
}

function EditTeamForm({
  team,
  disabled,
  onSaved,
}: {
  team: Team;
  disabled: boolean;
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: team.name,
    projectName: team.projectName,
    projectDescription: team.projectDescription ?? '',
    reportUrl: team.reportUrl ?? '',
    prototypeUrl: team.prototypeUrl ?? '',
    videoUrl: team.videoUrl ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/teams/${team.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      onSaved('资料已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="项目资料">
      {error && <Banner kind="error">{error}</Banner>}
      <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
        <Field label="团队名称" required>
          <NeonInput value={form.name} onChange={set('name')} disabled={disabled} required />
        </Field>
        <Field label="项目名称" required>
          <NeonInput
            value={form.projectName}
            onChange={set('projectName')}
            disabled={disabled}
            required
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="项目简介">
            <NeonTextarea
              value={form.projectDescription}
              onChange={set('projectDescription')}
              disabled={disabled}
              rows={2}
            />
          </Field>
        </div>
        <Field label="报告链接">
          <NeonInput value={form.reportUrl} onChange={set('reportUrl')} disabled={disabled} />
        </Field>
        <Field label="原型链接">
          <NeonInput value={form.prototypeUrl} onChange={set('prototypeUrl')} disabled={disabled} />
        </Field>
        <div className="md:col-span-2">
          <Field label="演示视频链接">
            <NeonInput value={form.videoUrl} onChange={set('videoUrl')} disabled={disabled} />
          </Field>
        </div>
        {!disabled && (
          <div className="md:col-span-2">
            <GlitchButton type="submit" disabled={busy}>
              {busy ? '保存中…' : '保存资料'}
            </GlitchButton>
          </div>
        )}
      </form>
    </Panel>
  );
}

function AddMember({
  teamId,
  excludeIds = [],
  onAdded,
}: {
  teamId: string;
  excludeIds?: string[];
  onAdded: () => Promise<void>;
}) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'captain' | 'member'>('member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
      });
      setUserId('');
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={add} className="mt-3 border-t border-cyan/20 pt-3">
      {error && <Banner kind="error">{error}</Banner>}
      <Field label="选择成员" hint="已排除本队成员；已在其他团队的会被后端拒绝">
        <div className="flex gap-2">
          <UserSelect
            value={userId}
            onChange={setUserId}
            excludeIds={excludeIds}
            className="min-w-[260px]"
          />
          <NeonSelect
            value={role}
            onChange={(e) => setRole(e.target.value as 'captain' | 'member')}
          >
            <option value="member">成员</option>
            <option value="captain">队长</option>
          </NeonSelect>
          <GlitchButton variant="ghost" type="submit" disabled={busy}>
            添加
          </GlitchButton>
        </div>
      </Field>
    </form>
  );
}

function RegisterAttachment({ teamId, onAdded }: { teamId: string; onAdded: () => Promise<void> }) {
  const [form, setForm] = useState({ type: 'report', fileName: '', mimeType: '', sizeBytes: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/teams/${teamId}/attachments`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ type: 'report', fileName: '', mimeType: '', sizeBytes: 0 });
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登记失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 border-t border-cyan/20 pt-3">
      {error && <Banner kind="error">{error}</Banner>}
      <div className="grid gap-2 md:grid-cols-4">
        <Field label="类型">
          <NeonSelect
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {Object.entries(ATTACHMENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NeonSelect>
        </Field>
        <Field label="文件名">
          <NeonInput
            value={form.fileName}
            onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))}
            required
          />
        </Field>
        <Field label="MIME">
          <NeonInput
            value={form.mimeType}
            onChange={(e) => setForm((f) => ({ ...f, mimeType: e.target.value }))}
            required
          />
        </Field>
        <Field label="大小(字节)">
          <NeonInput
            type="number"
            value={form.sizeBytes}
            onChange={(e) => setForm((f) => ({ ...f, sizeBytes: Number(e.target.value) }))}
            required
          />
        </Field>
      </div>
      <p className="mb-2 font-mono text-xs text-dim">
        注：当前仅登记元数据，二进制上传需 MinIO/S3 环境。
      </p>
      <GlitchButton variant="ghost" type="submit" disabled={busy}>
        登记附件
      </GlitchButton>
    </form>
  );
}

function SubmitTeam({ teamId, onSubmitted }: { teamId: string; onSubmitted: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/teams/${teamId}/submit`, { method: 'POST' });
      await onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="提交">
      {error && <Banner kind="error">{error}</Banner>}
      <p className="mb-3 font-mono text-xs text-dim">
        提交后生成不可变版本快照，截止后不可再改（管理员可解锁）。
      </p>
      <GlitchButton variant="danger" disabled={busy} onClick={submit}>
        {busy ? '提交中…' : '提交项目'}
      </GlitchButton>
    </Panel>
  );
}

function CreateTeam({
  competitionId,
  deadline,
  onCreated,
}: {
  competitionId: string;
  deadline: string | null;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    projectName: '',
    projectDescription: '',
    reportUrl: '',
    prototypeUrl: '',
    videoUrl: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/competitions/${competitionId}/teams`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="创建团队（你将成为队长）">
      {deadline && <p className="mb-3 font-mono text-xs text-dim">提交截止 {fmtDate(deadline)}</p>}
      {error && <Banner kind="error">{error}</Banner>}
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Field label="团队名称" required>
          <NeonInput value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="项目名称" required>
          <NeonInput value={form.projectName} onChange={set('projectName')} required />
        </Field>
        <div className="md:col-span-2">
          <Field label="项目简介">
            <NeonTextarea
              value={form.projectDescription}
              onChange={set('projectDescription')}
              rows={2}
            />
          </Field>
        </div>
        <Field label="报告链接">
          <NeonInput value={form.reportUrl} onChange={set('reportUrl')} />
        </Field>
        <Field label="原型链接">
          <NeonInput value={form.prototypeUrl} onChange={set('prototypeUrl')} />
        </Field>
        <div className="md:col-span-2">
          <Field label="演示视频链接">
            <NeonInput value={form.videoUrl} onChange={set('videoUrl')} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <GlitchButton type="submit" disabled={busy}>
            {busy ? '创建中…' : '创建团队'}
          </GlitchButton>
        </div>
      </form>
    </Panel>
  );
}
