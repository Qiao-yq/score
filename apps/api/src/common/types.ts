/** 全局角色（users.global_role） */
export type GlobalRole = 'admin' | 'teacher' | 'audience';

/** 团队成员角色（team_members.role） */
export type TeamRole = 'captain' | 'member';

/** JWT 解析后的当前用户 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
}

/** 当前用户在某个比赛内的有效角色（用于服务端权限判断） */
export interface CompetitionRole {
  isAdmin: boolean;
  isTeacher: boolean;
  teamId: string | null;
  teamRole: TeamRole | null;
}
