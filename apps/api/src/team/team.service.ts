import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, Team } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { EVENT } from '@task/contracts';
import { AccessService } from '../access/access.service';
import { AuditService } from '../audit/audit.service';
import { apiError, forbidden, notFound, validationError } from '../common/errors';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { RegisterAttachmentDto } from './dto/register-attachment.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

/** 团队详情包含关系 */
const teamInclude = {
  competition: { select: { id: true, name: true, submitDeadline: true } },
  members: { include: { user: { select: { id: true, email: true, name: true } } } },
  attachments: true,
} satisfies Prisma.TeamInclude;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /** 创建团队（创建者成为队长）；同一比赛内一个用户只能属于一个团队 */
  async create(user: AuthUser, competitionId: string, dto: CreateTeamDto) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) notFound('比赛不存在');

    const existing = await this.prisma.teamMember.findFirst({
      where: { userId: user.id, team: { competitionId } },
    });
    if (existing) validationError('你已加入本比赛的其他团队');

    const team = await this.prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          competitionId,
          name: dto.name,
          projectName: dto.projectName,
          projectDescription: dto.projectDescription,
          reportUrl: dto.reportUrl,
          prototypeUrl: dto.prototypeUrl,
          videoUrl: dto.videoUrl,
          status: 'draft',
        },
      });
      await tx.teamMember.create({
        data: { teamId: created.id, userId: user.id, role: 'captain' },
      });
      return created;
    });

    await this.audit.log({
      actorId: user.id,
      action: 'team.create',
      entityType: 'team',
      entityId: team.id,
      after: team,
    });
    return this.get(user, team.id);
  }

  /** 团队列表（按角色脱敏）：admin/教师全量，成员仅本队，其他空 */
  async list(user: AuthUser, competitionId: string) {
    const role = await this.access.resolve(user, competitionId);
    if (role.isAdmin || role.isTeacher) {
      return this.prisma.team.findMany({
        where: { competitionId },
        orderBy: { createdAt: 'asc' },
        include: { members: { include: { user: { select: { id: true, name: true } } } } },
      });
    }
    if (role.teamId) {
      return this.prisma.team.findMany({
        where: { id: role.teamId },
        include: { members: { include: { user: { select: { id: true, name: true } } } } },
      });
    }
    return [];
  }

  /** 团队详情（权限：本队/教师/管理员） */
  async get(user: AuthUser, teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: teamInclude });
    if (!team) notFound('团队不存在');
    await this.assertCanView(user, team);
    return team;
  }

  /** 修改资料（队长，status=draft 时） */
  async update(user: AuthUser, teamId: string, dto: UpdateTeamDto) {
    const team = await this.requireTeam(teamId);
    await this.assertCaptain(user, team);
    const updated = await this.prisma.team.update({ where: { id: teamId }, data: dto });
    await this.audit.log({
      actorId: user.id,
      action: 'team.update',
      entityType: 'team',
      entityId: teamId,
      before: team,
      after: updated,
    });
    return updated;
  }

  /** 添加成员（队长） */
  async addMember(user: AuthUser, teamId: string, dto: AddMemberDto) {
    const team = await this.requireTeam(teamId);
    await this.assertCaptain(user, team);

    const existing = await this.prisma.teamMember.findFirst({
      where: { userId: dto.userId, team: { competitionId: team.competitionId } },
    });
    if (existing) validationError('该用户已加入本比赛的其他团队');

    const member = await this.prisma.teamMember.create({
      data: { teamId, userId: dto.userId, role: dto.role ?? 'member' },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'team.add_member',
      entityType: 'team',
      entityId: teamId,
      after: { userId: dto.userId, role: dto.role ?? 'member' },
    });
    return member;
  }

  /** 登记附件元数据（二进制上传 + 病毒扫描 + S3 写留到 Linux/MinIO 环境） */
  async registerAttachment(user: AuthUser, teamId: string, dto: RegisterAttachmentDto) {
    const team = await this.requireTeam(teamId);
    await this.assertCaptain(user, team);
    const objectKey = `attachments/${team.competitionId}/${teamId}/${randomUUID()}`;
    return this.prisma.attachment.create({
      data: {
        teamId,
        type: dto.type,
        objectKey,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        version: 1,
        accessStatus: 'available',
        createdBy: user.id,
      },
    });
  }

  /** 提交：截止时间锁定 + 不可变版本快照（事务） */
  async submit(user: AuthUser, teamId: string) {
    const team = await this.requireTeam(teamId);
    await this.assertCaptain(user, team);

    const deadline = team.competition.submitDeadline;
    if (new Date() > deadline) {
      return apiError(HttpStatus.CONFLICT, 'SUBMIT_LOCKED', '已过提交截止时间，需管理员解锁');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.teamSubmission.aggregate({
        where: { teamId },
        _max: { version: true },
      });
      const version = (aggregate._max.version ?? 0) + 1;

      const full = await tx.team.findUnique({
        where: { id: teamId },
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          attachments: true,
        },
      });
      if (!full) notFound('团队不存在');

      const snapshot = {
        team: {
          name: full.name,
          projectName: full.projectName,
          projectDescription: full.projectDescription,
          reportUrl: full.reportUrl,
          prototypeUrl: full.prototypeUrl,
          videoUrl: full.videoUrl,
        },
        members: full.members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.role })),
        attachments: full.attachments.map((a) => ({
          id: a.id,
          type: a.type,
          fileName: a.fileName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          version: a.version,
        })),
      };

      const submission = await tx.teamSubmission.create({
        data: { teamId, version, snapshot },
      });
      await tx.team.update({
        where: { id: teamId },
        data: { status: 'submitted', submittedAt: new Date() },
      });
      return submission;
    });

    await this.audit.log({
      actorId: user.id,
      action: 'team.submit',
      entityType: 'team',
      entityId: teamId,
      after: { version: result.version },
    });

    await this.realtime.publish({
      event: EVENT.TEAM_SUBMITTED,
      competitionId: team.competition.id,
      entityId: teamId,
      entityVersion: result.version,
      actorId: user.id,
      payload: { teamId, version: result.version, submittedAt: result.submittedAt.toISOString() },
      scope: 'staff',
    });
    return result;
  }

  /** 管理员解锁（重新开放编辑/重提） */
  async unlock(user: AuthUser, teamId: string, reason: string) {
    if (!this.access.isAdmin(user)) forbidden();
    const team = await this.requireTeam(teamId);
    await this.prisma.team.update({ where: { id: teamId }, data: { status: 'draft' } });

    // 记录解锁到最近一次提交版本
    const latest = await this.prisma.teamSubmission.findFirst({
      where: { teamId },
      orderBy: { version: 'desc' },
    });
    if (latest) {
      await this.prisma.teamSubmission.update({
        where: { id: latest.id },
        data: { unlockedBy: user.id, unlockReason: reason },
      });
    }

    await this.audit.log({
      actorId: user.id,
      action: 'team.unlock',
      entityType: 'team',
      entityId: teamId,
      reason,
      before: { status: team.status },
      after: { status: 'draft' },
    });
    return { unlocked: true, teamId };
  }

  // ── 内部辅助 ─────────────────────────────────────────────

  private async requireTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: teamInclude });
    if (!team) notFound('团队不存在');
    return team;
  }

  private async assertCanView(user: AuthUser, team: Team & { competition: { id: string } }) {
    const role = await this.access.resolve(user, team.competition.id);
    if (role.isAdmin || role.isTeacher) return;
    if (role.teamId === team.id) return;
    notFound('团队不存在'); // 不泄露存在性
  }

  private async assertCaptain(user: AuthUser, team: Team) {
    if (team.status !== 'draft') {
      return apiError(HttpStatus.CONFLICT, 'SUBMIT_LOCKED', '团队已提交或锁定，需管理员解锁');
    }
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
    });
    if (!membership || membership.role !== 'captain') forbidden('仅队长可操作');
  }
}
