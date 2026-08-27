import { describe, expect, it } from 'vitest';
import { scopeAllows, type ScopeContext } from './scope';

const admin: ScopeContext = { isAdmin: true, isTeacher: true, teamId: null };
const teacher: ScopeContext = { isAdmin: false, isTeacher: true, teamId: null };
const memberA: ScopeContext = { isAdmin: false, isTeacher: false, teamId: 'team-a' };
const publicCtx: ScopeContext = { isAdmin: false, isTeacher: false, teamId: null };

describe('scopeAllows（WS 广播过滤，M1-02 §5.4）', () => {
  it('admin scope 仅管理员', () => {
    expect(scopeAllows(admin, 'admin')).toBe(true);
    expect(scopeAllows(teacher, 'admin')).toBe(false);
    expect(scopeAllows(memberA, 'admin')).toBe(false);
    expect(scopeAllows(publicCtx, 'admin')).toBe(false);
  });

  it('staff scope：管理员 + 教师', () => {
    expect(scopeAllows(admin, 'staff')).toBe(true);
    expect(scopeAllows(teacher, 'staff')).toBe(true);
    expect(scopeAllows(memberA, 'staff')).toBe(false);
    expect(scopeAllows(publicCtx, 'staff')).toBe(false);
  });

  it('team scope：管理员/教师/本队可见，他队不可见', () => {
    expect(scopeAllows(admin, 'team', 'team-a')).toBe(true);
    expect(scopeAllows(teacher, 'team', 'team-a')).toBe(true);
    expect(scopeAllows(memberA, 'team', 'team-a')).toBe(true);
    expect(scopeAllows(memberA, 'team', 'team-b')).toBe(false);
    expect(scopeAllows(publicCtx, 'team', 'team-a')).toBe(false);
  });

  it('public scope：所有人可见', () => {
    expect(scopeAllows(admin, 'public')).toBe(true);
    expect(scopeAllows(teacher, 'public')).toBe(true);
    expect(scopeAllows(memberA, 'public')).toBe(true);
    expect(scopeAllows(publicCtx, 'public')).toBe(true);
  });

  it('team scope 未指定 teamId 时普通成员不可见', () => {
    expect(scopeAllows(memberA, 'team')).toBe(false);
  });
});
