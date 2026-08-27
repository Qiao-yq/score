import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { GLOBAL_ROLE_LABELS } from '../lib/format';
import type { GlobalRole, UserPublic } from '../lib/types';
import { NeonSelect } from './form/NeonSelect';

/**
 * 用户选择器：拉取 GET /users 渲染下拉。
 * - role：按全局角色过滤（如分配教师用 "teacher"）。
 * - excludeIds：排除已在列表中的用户（如添加成员时排除现有队员）。
 */
export function UserSelect({
  value,
  onChange,
  role,
  excludeIds = [],
  placeholder = '— 选择用户 —',
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  role?: GlobalRole;
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
}) {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    const excluded = excludeKey ? excludeKey.split(',') : [];
    const qs = role ? `?role=${encodeURIComponent(role)}` : '';
    let cancelled = false;
    api<UserPublic[]>(`/users${qs}`)
      .then((list) => {
        if (cancelled) return;
        setUsers(list.filter((u) => !excluded.includes(u.id)));
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [role, excludeKey]);

  return (
    <NeonSelect value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">{placeholder}</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} · {u.email}（{GLOBAL_ROLE_LABELS[u.globalRole] ?? u.globalRole}）
        </option>
      ))}
    </NeonSelect>
  );
}
