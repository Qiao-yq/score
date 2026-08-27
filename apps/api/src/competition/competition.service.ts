import { Injectable } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { AuditService } from '../audit/audit.service';
import { forbidden, notFound, validationError } from '../common/errors';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { POC_RUBRIC_VERSION } from '../scoring/rubric-defaults';
import type { AssignTeacherDto } from './dto/assign-teacher.dto';
import type { CreateCompetitionDto } from './dto/create-competition.dto';
import type { UpdateCompetitionDto } from './dto/update-competition.dto';

@Injectable()
export class CompetitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly audit: AuditService,
  ) {}

  async create(user: AuthUser, dto: CreateCompetitionDto) {
    if (!this.access.isAdmin(user)) forbidden();
    const competition = await this.prisma.competition.create({
      data: {
        name: dto.name,
        timezone: dto.timezone ?? 'Asia/Shanghai',
        submitDeadline: new Date(dto.submitDeadline),
        rubricVersion: dto.rubricVersion ?? POC_RUBRIC_VERSION,
        peerReviewEnabled: dto.peerReviewEnabled ?? true,
        dashboardPublished: dto.dashboardPublished ?? false,
        status: 'active',
        createdBy: user.id,
      },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'competition.create',
      entityType: 'competition',
      entityId: competition.id,
      after: competition,
    });
    return competition;
  }

  async list(user: AuthUser) {
    if (user.globalRole === 'admin') {
      return this.prisma.competition.findMany({ orderBy: { createdAt: 'desc' } });
    }
    const [asTeacher, asMember] = await Promise.all([
      this.prisma.competition.findMany({
        where: { teachers: { some: { userId: user.id } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.competition.findMany({
        where: { teams: { some: { members: { some: { userId: user.id } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const map = new Map<string, (typeof asTeacher)[number]>();
    for (const c of [...asTeacher, ...asMember]) map.set(c.id, c);
    return [...map.values()];
  }

  async get(user: AuthUser, id: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) notFound('比赛不存在');
    const myRole = await this.access.resolve(user, id);
    return { ...competition, myRole };
  }

  async update(user: AuthUser, id: string, dto: UpdateCompetitionDto) {
    if (!this.access.isAdmin(user)) forbidden();
    const existing = await this.prisma.competition.findUnique({ where: { id } });
    if (!existing) notFound('比赛不存在');
    const data: Record<string, unknown> = { ...dto };
    if (dto.submitDeadline) data.submitDeadline = new Date(dto.submitDeadline);
    const updated = await this.prisma.competition.update({ where: { id }, data });
    await this.audit.log({
      actorId: user.id,
      action: 'competition.update',
      entityType: 'competition',
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async assignTeacher(user: AuthUser, id: string, dto: AssignTeacherDto) {
    if (!this.access.isAdmin(user)) forbidden();
    await this.ensureCompetition(id);
    const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!target) validationError('用户不存在');
    const link = await this.prisma.competitionTeacher.upsert({
      where: { competitionId_userId: { competitionId: id, userId: dto.userId } },
      create: { competitionId: id, userId: dto.userId },
      update: {},
    });
    await this.audit.log({
      actorId: user.id,
      action: 'competition.assign_teacher',
      entityType: 'competition',
      entityId: id,
      after: { userId: dto.userId },
    });
    return link;
  }

  async removeTeacher(user: AuthUser, id: string, userId: string) {
    if (!this.access.isAdmin(user)) forbidden();
    await this.prisma.competitionTeacher.deleteMany({
      where: { competitionId: id, userId },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'competition.remove_teacher',
      entityType: 'competition',
      entityId: id,
      after: { userId },
    });
    return { removed: true };
  }

  async setDashboardPublished(user: AuthUser, id: string, published: boolean) {
    if (!this.access.isAdmin(user)) forbidden();
    const updated = await this.prisma.competition.update({
      where: { id },
      data: { dashboardPublished: published },
    });
    await this.audit.log({
      actorId: user.id,
      action: published ? 'competition.publish_dashboard' : 'competition.unpublish_dashboard',
      entityType: 'competition',
      entityId: id,
      after: { dashboardPublished: published },
    });
    return updated;
  }

  private async ensureCompetition(id: string) {
    const c = await this.prisma.competition.findUnique({ where: { id } });
    if (!c) notFound('比赛不存在');
    return c;
  }
}
