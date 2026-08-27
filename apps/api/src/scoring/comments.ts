/**
 * 评语亮点/建议校验与可见性过滤（纯函数）。
 * 可见性规则（PRD §5.2）：
 *   captain   → 仅队长(本队) + 教师 + 管理员
 *   all       → 队长/成员(本队) + 教师 + 管理员
 *   dashboard → 公开（含观众，仅 published 后）
 */

import type { CommentVisibility } from '@task/contracts';

export type ViewerRole = 'admin' | 'teacher' | 'captain' | 'member' | 'audience';

export interface CommentViewer {
  role: ViewerRole;
  /** 是否为该评语所属团队的成员 */
  isOwnTeam: boolean;
}

/** 评语长度校验（≥ minChars） */
export function validateCommentLength(text: string, minChars: number): boolean {
  return text.trim().length >= minChars;
}

/** 服务端可见性过滤：返回该 viewer 能否看到该可见性的评语 */
export function canViewComment(visibility: CommentVisibility, viewer: CommentViewer): boolean {
  const privileged = viewer.role === 'admin' || viewer.role === 'teacher';
  switch (visibility) {
    case 'captain':
      return privileged || (viewer.isOwnTeam && viewer.role === 'captain');
    case 'all':
      return privileged || viewer.isOwnTeam;
    case 'dashboard':
      return true;
    default:
      return false;
  }
}
