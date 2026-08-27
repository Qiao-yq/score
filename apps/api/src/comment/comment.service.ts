import { HttpStatus, Injectable } from '@nestjs/common';
import type { CommentVisibility } from '@task/contracts';
import { AccessService } from '../access/access.service';
import { AuditService } from '../audit/audit.service';
import { apiError, forbidden, notFound, validationError } from '../common/errors';
import type { AuthUser, CompetitionRole } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { canViewComment, validateCommentLength } from '../scoring/comments';
import type { CommentViewer, ViewerRole } from '../scoring/comments';
import type { RubricDefinition } from '../scoring/rubric.types';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { UpdateCommentVisibilityDto } from './dto/update-comment-visibility.dto';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly audit: AuditService,
  ) {}

  /** 教师/管理员新增评语（亮点/建议/标签/可见性） */
  async create(user: AuthUser, teamId: string, dto: CreateCommentDto) {
    const team = await this.requireTeam(teamId);
    const role = await this.access.resolve(user, team.competitionId);
    if (!role.isAdmin && !role.isTeacher) forbidden('无评语权限');

    const rubric = await this.loadRubric(team.rubricVersion);
    if (!validateCommentLength(dto.highlight, rubric.commentRules.minHighlightChars)) {
      validationError(`亮点至少 ${rubric.commentRules.minHighlightChars} 字`);
    }
    if (!validateCommentLength(dto.suggestion, rubric.commentRules.minSuggestionChars)) {
      validationError(`建议至少 ${rubric.commentRules.minSuggestionChars} 字`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        teamId,
        dimensionKey: dto.dimensionKey,
        scoreVersion: dto.scoreVersion,
        highlight: dto.highlight,
        suggestion: dto.suggestion,
        tags: dto.tags ?? [],
        visibility: dto.visibility ?? 'captain',
        source: 'teacher',
        createdBy: user.id,
      },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'comment.create',
      entityType: 'comment',
      entityId: comment.id,
      after: { teamId, dimensionKey: dto.dimensionKey },
    });
    return comment;
  }

  /** 评语列表（服务端按 visibility 过滤） */
  async list(user: AuthUser, teamId: string) {
    const team = await this.requireTeam(teamId);
    const role = await this.access.resolve(user, team.competitionId);
    const viewer = this.toViewer(role, teamId);
    const comments = await this.prisma.comment.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
    return comments.filter((c) => canViewComment(c.visibility as CommentVisibility, viewer));
  }

  /** 调整可见性（教师/管理员） */
  async updateVisibility(user: AuthUser, commentId: string, dto: UpdateCommentVisibilityDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { team: { select: { competitionId: true } } },
    });
    if (!comment) notFound('评语不存在');
    const role = await this.access.resolve(user, comment.team.competitionId);
    if (!role.isAdmin && !role.isTeacher) forbidden('无评语权限');

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { visibility: dto.visibility },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'comment.update_visibility',
      entityType: 'comment',
      entityId: commentId,
      after: { visibility: dto.visibility },
    });
    return updated;
  }

  // ── 辅助 ───────────────────────────────────────────────────

  private toViewer(role: CompetitionRole, teamId: string): CommentViewer {
    let viewerRole: ViewerRole;
    if (role.isAdmin) viewerRole = 'admin';
    else if (role.isTeacher) viewerRole = 'teacher';
    else if (role.teamId === teamId)
      viewerRole = role.teamRole === 'captain' ? 'captain' : 'member';
    else viewerRole = 'audience';
    return { role: viewerRole, isOwnTeam: role.teamId === teamId };
  }

  private async requireTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        competitionId: true,
        competition: { select: { rubricVersion: true } },
      },
    });
    if (!team) notFound('团队不存在');
    return {
      id: team.id,
      competitionId: team.competitionId,
      rubricVersion: team.competition.rubricVersion,
    };
  }

  private async loadRubric(rubricVersion: string): Promise<RubricDefinition> {
    const row = await this.prisma.rubric.findUnique({ where: { rubricVersion } });
    if (!row) {
      return apiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        `判分标准 ${rubricVersion} 不存在，请先运行 seed`,
      );
    }
    return row.definition as unknown as RubricDefinition;
  }
}
