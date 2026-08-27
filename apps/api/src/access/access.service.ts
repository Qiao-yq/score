import { Injectable } from '@nestjs/common';
import type { AuthUser, CompetitionRole, TeamRole } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 服务端访问控制：解析当前用户在某个比赛内的有效角色。
 * 团队内成员同一比赛唯一性（PRD §4）依赖 team_members 查询，不在此处额外约束。
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  isAdmin(user: AuthUser): boolean {
    return user.globalRole === 'admin';
  }

  /** 是否为该比赛的被分配教师（管理员也视为可评审） */
  async isCompetitionTeacher(user: AuthUser, competitionId: string): Promise<boolean> {
    if (user.globalRole === 'admin') return true;
    if (user.globalRole !== 'teacher') return false;
    const link = await this.prisma.competitionTeacher.findUnique({
      where: { competitionId_userId: { competitionId, userId: user.id } },
    });
    return link !== null;
  }

  /** 该用户在此比赛内的团队归属（若无则 null） */
  async getTeamMembership(
    user: AuthUser,
    competitionId: string,
  ): Promise<{ teamId: string; role: TeamRole } | null> {
    const member = await this.prisma.teamMember.findFirst({
      where: { userId: user.id, team: { competitionId } },
      select: { teamId: true, role: true },
    });
    return member ? { teamId: member.teamId, role: member.role as TeamRole } : null;
  }

  /** 汇总为 CompetitionRole，供各服务端权限判断使用 */
  async resolve(user: AuthUser, competitionId: string): Promise<CompetitionRole> {
    const isAdmin = this.isAdmin(user);
    const isTeacher = await this.isCompetitionTeacher(user, competitionId);
    const membership = await this.getTeamMembership(user, competitionId);
    return {
      isAdmin,
      isTeacher,
      teamId: membership?.teamId ?? null,
      teamRole: membership?.role ?? null,
    };
  }
}
