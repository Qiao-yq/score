import type { WsScope } from '@task/contracts';

/** 订阅者在某比赛内的有效角色（用于广播 scope 过滤） */
export interface ScopeContext {
  isAdmin: boolean;
  isTeacher: boolean;
  teamId: string | null;
}

/**
 * 广播 scope 过滤（纯函数，M1-02 §5.4）。
 * admin → 仅管理员；staff → 管理员+教师；team → 管理员/教师/本队；public → 所有。
 */
export function scopeAllows(ctx: ScopeContext, scope: WsScope, teamId?: string): boolean {
  switch (scope) {
    case 'admin':
      return ctx.isAdmin;
    case 'staff':
      return ctx.isAdmin || ctx.isTeacher;
    case 'team':
      return ctx.isAdmin || ctx.isTeacher || (teamId != null && ctx.teamId === teamId);
    case 'public':
      return true;
  }
}
