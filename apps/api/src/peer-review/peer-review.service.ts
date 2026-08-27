import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EVENT, PEER_MAPPING_ALGORITHM } from '@task/contracts';
import { AccessService } from '../access/access.service';
import { AuditService } from '../audit/audit.service';
import { apiError, forbidden, notFound } from '../common/errors';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { computeComposite, computeFinalScore } from '../scoring/formula';
import type { RubricDefinition } from '../scoring/rubric.types';
import type { ResolvePeerReviewDto } from './dto/resolve-peer-review.dto';
import type { SubmitPeerReviewDto } from './dto/submit-peer-review.dto';
import { aggregatePeerScore, buildMapping, detectAnomaly, type MappingEdge } from './no-push';

/** 参与互评的团队状态（已提交及之后） */
const PARTICIPANT_STATUSES = ['submitted', 'locked', 'published'] as const;

/**
 * NO Push 互评（M1-05）：随机一对一映射 + 队长单次评分 + 双盲 + 异常检测 + 匿名聚合。
 * 管理员处理异常后重新触发聚合；映射/评分 append-only，重分配生成新映射版本。
 */
@Injectable()
export class PeerReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /** 管理员生成随机一对一映射（拒绝采样 derangement，算法版本化） */
  async generateMapping(user: AuthUser, competitionId: string) {
    this.assertAdmin(user);
    const teamIds = await this.participantTeamIds(competitionId);
    const mapping = buildMapping(teamIds, Math.random);
    if (!mapping) {
      return { generated: false, reason: 'insufficient_teams', submittedTeamCount: teamIds.length };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.peerReviewMapping.updateMany({
        where: { competitionId, status: 'active' },
        data: { status: 'closed' },
      });
      return tx.peerReviewMapping.create({
        data: {
          competitionId,
          algorithmVersion: PEER_MAPPING_ALGORITHM,
          mapping: mapping as unknown as Prisma.InputJsonValue,
          status: 'active',
          createdBy: user.id,
        },
      });
    });

    await this.audit.log({
      actorId: user.id,
      action: 'peer_review.mapping_generate',
      entityType: 'peer_review_mapping',
      entityId: created.id,
      after: { mapping, algorithmVersion: PEER_MAPPING_ALGORITHM },
    });
    return this.serializeMapping(created.id, mapping, created.status);
  }

  /** 队长获取被分配团队的匿名资料（双盲：不含队名/队长/评分来源身份） */
  async getMyTarget(user: AuthUser, competitionId: string) {
    const { teamId } = await this.resolveCaptain(user, competitionId);
    const active = await this.findActiveMapping(competitionId);
    if (!active) {
      return apiError(HttpStatus.CONFLICT, 'PEER_NOT_OPEN', '互评尚未开启或已截止');
    }
    const edges = active.mapping as unknown as MappingEdge[];
    const edge = edges.find((e) => e.reviewerTeamId === teamId);
    if (!edge) {
      return apiError(HttpStatus.CONFLICT, 'PEER_NOT_OPEN', '你未被分配互评对象');
    }

    const target = await this.prisma.team.findUnique({ where: { id: edge.targetTeamId } });
    if (!target) notFound('被评团队不存在');

    const existing = await this.prisma.peerReview.findUnique({
      where: { mappingId_reviewerTeamId: { mappingId: active.id, reviewerTeamId: teamId } },
    });

    return {
      mappingId: active.id,
      targetRef: this.anonymizeRef(edges, edge.targetTeamId),
      projectName: target.projectName,
      projectDescription: target.projectDescription,
      reportUrl: target.reportUrl,
      prototypeUrl: target.prototypeUrl,
      videoUrl: target.videoUrl,
      alreadySubmitted: existing !== null,
    };
  }

  /** 队长单次提交 0–100 整数分；命中异常 → suspicious（暂不计分）并通知管理员 */
  async submit(user: AuthUser, competitionId: string, dto: SubmitPeerReviewDto) {
    const { teamId } = await this.resolveCaptain(user, competitionId);
    const active = await this.findActiveMapping(competitionId);
    if (!active) {
      return apiError(HttpStatus.CONFLICT, 'PEER_NOT_OPEN', '互评尚未开启或已截止');
    }
    const edges = active.mapping as unknown as MappingEdge[];
    const edge = edges.find((e) => e.reviewerTeamId === teamId);
    if (!edge) {
      return apiError(HttpStatus.CONFLICT, 'PEER_NOT_OPEN', '你未被分配互评对象');
    }

    const existing = await this.prisma.peerReview.findUnique({
      where: { mappingId_reviewerTeamId: { mappingId: active.id, reviewerTeamId: teamId } },
    });
    if (existing) {
      return apiError(HttpStatus.CONFLICT, 'DUPLICATE_SUBMIT', '已提交过互评，不可重复提交');
    }

    const teamIds = [...new Set(edges.flatMap((e) => [e.reviewerTeamId, e.targetTeamId]))];
    const reasons = detectAnomaly(dto.score, edges, teamIds);
    const status = reasons.length > 0 ? 'suspicious' : 'submitted';

    const review = await this.prisma.peerReview.create({
      data: {
        competitionId,
        mappingId: active.id,
        reviewerTeamId: teamId,
        targetTeamId: edge.targetTeamId,
        score: dto.score,
        status,
        anomalyReasons: reasons,
        submittedBy: user.id,
      },
    });

    await this.audit.log({
      actorId: user.id,
      action: 'peer_review.submit',
      entityType: 'peer_review',
      entityId: review.id,
      after: { score: dto.score, status, anomalyReasons: reasons, targetTeamId: edge.targetTeamId },
    });

    await this.syncPeerScores(competitionId);
    if (reasons.length > 0) {
      await this.realtime.publish({
        event: EVENT.PEER_REVIEW_FLAGGED,
        competitionId,
        entityId: review.id,
        actorId: user.id,
        payload: { reviewId: review.id, anomalyReasons: reasons },
        scope: 'admin',
      });
    } else {
      await this.realtime.publish({
        event: EVENT.PEER_REVIEW_SUBMITTED,
        competitionId,
        entityId: review.id,
        actorId: user.id,
        payload: { reviewId: review.id, score: dto.score },
        scope: 'admin',
      });
    }
    await this.publishRanking(competitionId);

    return { reviewId: review.id, status, targetTeamId: edge.targetTeamId };
  }

  /** 管理员复核异常：作废/确认有效/重新分配（需 reason，生成新版本） */
  async resolve(
    user: AuthUser,
    competitionId: string,
    reviewId: string,
    dto: ResolvePeerReviewDto,
  ) {
    this.assertAdmin(user);

    if (dto.action === 'regenerate') {
      return this.regenerate(user, competitionId, dto.reason);
    }

    const review = await this.prisma.peerReview.findUnique({ where: { id: reviewId } });
    if (!review || review.competitionId !== competitionId) notFound('互评记录不存在');

    const status = dto.action; // 'valid' | 'invalid'
    await this.prisma.peerReview.update({ where: { id: reviewId }, data: { status } });

    await this.audit.log({
      actorId: user.id,
      action: 'peer_review.resolve',
      entityType: 'peer_review',
      entityId: reviewId,
      before: { status: review.status },
      after: { status },
      reason: dto.reason,
    });

    await this.syncPeerScores(competitionId);
    await this.publishRanking(competitionId);
    return { reviewId, status };
  }

  /** 管理员查看完整映射 + 异常记录（审计） */
  async getAudit(user: AuthUser, competitionId: string) {
    this.assertAdmin(user);
    const [mappings, reviews] = await Promise.all([
      this.prisma.peerReviewMapping.findMany({
        where: { competitionId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.peerReview.findMany({
        where: { competitionId },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);
    return {
      mappings: mappings.map((m) =>
        this.serializeMapping(m.id, m.mapping as unknown as MappingEdge[], m.status),
      ),
      reviews: reviews.map((r) => ({
        id: r.id,
        mappingId: r.mappingId,
        reviewerTeamId: r.reviewerTeamId,
        targetTeamId: r.targetTeamId,
        score: r.score,
        status: r.status,
        anomalyReasons: r.anomalyReasons,
        submittedAt: r.submittedAt,
      })),
    };
  }

  // ── 聚合与同步 ───────────────────────────────────────────

  /** 重新分配：关闭当前映射，按已提交团队生成新映射（新版本），并重算聚合 */
  private async regenerate(user: AuthUser, competitionId: string, reason: string) {
    const teamIds = await this.participantTeamIds(competitionId);
    const mapping = buildMapping(teamIds, Math.random);
    if (!mapping) {
      return apiError(HttpStatus.CONFLICT, 'PEER_NOT_OPEN', '已提交团队不足 2 队，无法重分配');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.peerReviewMapping.updateMany({
        where: { competitionId, status: 'active' },
        data: { status: 'closed' },
      });
      return tx.peerReviewMapping.create({
        data: {
          competitionId,
          algorithmVersion: PEER_MAPPING_ALGORITHM,
          mapping: mapping as unknown as Prisma.InputJsonValue,
          status: 'active',
          createdBy: user.id,
        },
      });
    });

    await this.audit.log({
      actorId: user.id,
      action: 'peer_review.regenerate',
      entityType: 'peer_review_mapping',
      entityId: created.id,
      reason,
      after: { mapping },
    });

    await this.syncPeerScores(competitionId);
    await this.publishRanking(competitionId);
    return this.serializeMapping(created.id, mapping, created.status);
  }

  /**
   * 互评聚合同步：把每个参与队的有效互评分（received/100×5）写入其最新评分版本的
   * peer_review_score；若已批准/发布，则按公式重算 final_score。幂等。
   */
  private async syncPeerScores(competitionId: string): Promise<void> {
    const active = await this.findActiveMapping(competitionId);
    if (!active) return;

    const edges = active.mapping as unknown as MappingEdge[];
    const teamIds = [...new Set(edges.flatMap((e) => [e.reviewerTeamId, e.targetTeamId]))];
    const reviews = await this.prisma.peerReview.findMany({ where: { mappingId: active.id } });

    for (const teamId of teamIds) {
      const valid = reviews.filter(
        (r) =>
          r.targetTeamId === teamId &&
          (r.status === 'submitted' || r.status === 'valid') &&
          r.score != null,
      );
      const raw = valid.length > 0 ? (valid[0].score ?? 0) : 0;
      const peerScore = aggregatePeerScore(raw);

      const latest = await this.prisma.score.findFirst({
        where: { teamId },
        orderBy: { generatedAt: 'desc' },
      });
      if (!latest) continue;

      let finalScore: number | null = null;
      if (latest.finalScore != null) {
        const rubric = await this.prisma.rubric.findUnique({
          where: { rubricVersion: latest.rubricVersion },
        });
        const def = rubric?.definition as unknown as RubricDefinition | undefined;
        if (def) {
          const dims = await this.prisma.scoreDimension.findMany({ where: { scoreId: latest.id } });
          const compositeByDimension: Record<string, number> = {};
          for (const d of dims) {
            if (d.compositeScore != null)
              compositeByDimension[d.dimensionKey] = Number(d.compositeScore);
            else if (d.dimensionKey === 'submit_speed')
              compositeByDimension[d.dimensionKey] = d.agentScore ?? 0;
            else
              compositeByDimension[d.dimensionKey] = computeComposite(
                d.agentScore ?? 0,
                d.teacherScore ?? d.agentScore ?? 0,
              );
          }
          finalScore = computeFinalScore(compositeByDimension, def, peerScore);
        }
      }

      await this.prisma.score.update({
        where: { id: latest.id },
        data: { peerReviewScore: peerScore, ...(finalScore != null ? { finalScore } : {}) },
      });
    }
  }

  // ── 辅助 ─────────────────────────────────────────────────

  private assertAdmin(user: AuthUser): void {
    if (!this.access.isAdmin(user)) forbidden('仅管理员可执行该操作');
  }

  /** 仅队长可提交互评（管理员/教师不可，见 M1-02 §4 权限矩阵） */
  private async resolveCaptain(user: AuthUser, competitionId: string): Promise<{ teamId: string }> {
    const role = await this.access.resolve(user, competitionId);
    if (!role.teamId || role.teamRole !== 'captain') forbidden('仅队长可提交互评');
    return { teamId: role.teamId };
  }

  private async participantTeamIds(competitionId: string): Promise<string[]> {
    const teams = await this.prisma.team.findMany({
      where: { competitionId, status: { in: [...PARTICIPANT_STATUSES] } },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    return teams.map((t) => t.id);
  }

  private findActiveMapping(competitionId: string) {
    return this.prisma.peerReviewMapping.findFirst({
      where: { competitionId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 匿名编号：按参与队排序后的位置生成稳定标签，不暴露真实队名/id */
  private anonymizeRef(edges: MappingEdge[], targetTeamId: string): string {
    const ids = [...new Set(edges.flatMap((e) => [e.reviewerTeamId, e.targetTeamId]))].sort();
    return `团队 #${ids.indexOf(targetTeamId) + 1}`;
  }

  private serializeMapping(mappingId: string, mapping: MappingEdge[], status: string) {
    return {
      mappingId,
      algorithmVersion: PEER_MAPPING_ALGORITHM,
      status,
      edges: mapping,
    };
  }

  /** 广播 ranking.updated（payload 为轻量信号，前端据此重新拉取 /dashboard/ranking） */
  private async publishRanking(competitionId: string) {
    await this.realtime.publish({
      event: EVENT.RANKING_UPDATED,
      competitionId,
      payload: { competitionId },
      scope: 'public',
    });
  }
}
