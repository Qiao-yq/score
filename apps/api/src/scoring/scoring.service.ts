import { HttpStatus, Injectable } from '@nestjs/common';
import type { Score, ScoreDimension } from '@prisma/client';
import { EVENT } from '@task/contracts';
import { AccessService } from '../access/access.service';
import { AuditService } from '../audit/audit.service';
import { apiError, forbidden, notFound, validationError } from '../common/errors';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { computeComposite, computeFinalScore, computeSubmitSpeedScore } from './formula';
import type { RubricDefinition } from './rubric.types';
import { getDimension } from './rubric.types';
import { computeRiskFlags, findMissingEvidence, validateDimensionScore } from './validation';
import type { ReviewScoreDto } from './dto/review-score.dto';
import type { SaveAgentScoreDto } from './dto/save-agent-score.dto';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /** 触发 Agent 评分（异步）。M3 为受理桩，真实 worker 在 M0.5 接入后调用 saveAgentScore。 */
  async trigger(user: AuthUser, teamId: string) {
    await this.assertCanScore(user, teamId);
    return { taskId: teamId, status: 'processing' };
  }

  /** 评分任务状态（取最新评分版本状态，无则 not_started） */
  async scoreStatus(user: AuthUser, teamId: string) {
    await this.assertCanScore(user, teamId);
    const latest = await this.prisma.score.findFirst({
      where: { teamId },
      orderBy: { generatedAt: 'desc' },
    });
    return { teamId, status: latest?.status ?? 'not_started' };
  }

  /**
   * Agent 评分结果摄入（评分表单 + 维度校验 + 报告质量子项 + 自动提交速度分）。
   * 由评分 worker 调用；M3 阶段 admin/教师可直接调用以跑通闭环。
   * 一次写入 = scores + score_dimensions + agent comments，同事务。
   */
  async saveAgentScore(user: AuthUser, teamId: string, dto: SaveAgentScoreDto) {
    await this.assertCanScore(user, teamId);
    const team = await this.requireTeam(teamId);
    const rubric = await this.loadRubric(team.competition.rubricVersion);

    // 1. 维度覆盖与取值校验
    const errors: string[] = [];
    const agentKeys = rubric.dimensions.filter((d) => d.source === 'agent').map((d) => d.key);
    const provided = new Map(dto.dimensions.map((d) => [d.dimensionKey, d]));
    for (const key of agentKeys) {
      if (!provided.has(key)) errors.push(`缺少维度: ${key}`);
    }
    for (const d of dto.dimensions) {
      const dim = getDimension(rubric, d.dimensionKey);
      if (!dim || dim.source !== 'agent') {
        errors.push(`维度 ${d.dimensionKey} 非 Agent 维度`);
        continue;
      }
      errors.push(...validateDimensionScore(d, rubric));
    }
    if (errors.length > 0) return validationError(errors.join('；'), errors);

    // 2. 证据存在性硬校验（EVIDENCE_UNRESOLVED）
    const allEvidence = [...new Set(dto.dimensions.flatMap((d) => d.evidenceIds))];
    const existing = await this.prisma.evidence.findMany({
      where: { evidenceId: { in: allEvidence } },
      select: { evidenceId: true },
    });
    const existingSet = new Set(existing.map((e) => e.evidenceId));
    const missing = findMissingEvidence(allEvidence, existingSet);
    const unresolvedEvidence = missing.length > 0;

    // 3. 提交速度系统分（系统注入，Agent/教师不可改）
    const submitSpeed = computeSubmitSpeedScore(
      team.submittedAt ?? team.competition.submitDeadline,
      team.competition.submitDeadline,
      rubric.submitSpeedRule,
    );

    // 4. 汇总风险标记 → 决定初始状态
    const riskFlags = new Set<string>();
    for (const d of dto.dimensions) {
      for (const f of computeRiskFlags({
        confidence: d.agentConfidence,
        agentScore: d.agentScore,
        teacherScore: null,
        thresholds: rubric.thresholds,
      })) {
        riskFlags.add(f);
      }
    }
    if (unresolvedEvidence) riskFlags.add('unresolved_evidence');
    const status = riskFlags.size > 0 ? 'needs_review' : 'agent_scored';

    // 5. 事务写入（scores + score_dimensions + agent comments）
    const version = await this.nextVersion(teamId);
    const inputVersion = await this.inputVersion(teamId);

    const score = await this.prisma.$transaction(async (tx) => {
      const created = await tx.score.create({
        data: {
          teamId,
          scoreVersion: version,
          rubricVersion: team.competition.rubricVersion,
          inputVersion,
          status,
          riskFlags: [...riskFlags],
          modelVersion: dto.modelVersion,
          promptVersion: dto.promptVersion,
          createdBy: user.id,
        },
      });

      // submit_speed：系统值，agent/teacher 均等于系统分，合成=系统分
      await tx.scoreDimension.create({
        data: {
          scoreId: created.id,
          dimensionKey: 'submit_speed',
          agentScore: submitSpeed,
          agentConfidence: 1.0,
          agentEvidence: [],
          teacherScore: submitSpeed,
          teacherAction: 'approve',
          compositeScore: submitSpeed,
        },
      });

      for (const d of dto.dimensions) {
        await tx.scoreDimension.create({
          data: {
            scoreId: created.id,
            dimensionKey: d.dimensionKey,
            agentScore: d.agentScore,
            agentConfidence: d.agentConfidence,
            agentEvidence: d.evidenceIds,
            subScores: d.subScores ?? undefined,
            highlight: d.highlight,
            suggestion: d.suggestion,
          },
        });
        await tx.comment.create({
          data: {
            teamId,
            dimensionKey: d.dimensionKey,
            scoreVersion: version,
            highlight: d.highlight,
            suggestion: d.suggestion,
            tags: [],
            visibility: 'captain',
            source: 'agent',
            createdBy: user.id,
          },
        });
      }
      return created;
    });

    await this.audit.log({
      actorId: user.id,
      action: 'score.agent_saved',
      entityType: 'score',
      entityId: score.id,
      after: { version, status, riskFlags: [...riskFlags] },
    });

    const competitionId = team.competition.id;
    const entityVersion = Number(version.slice(1)) || 1;
    await this.realtime.publish({
      event: EVENT.SCORE_SUBMITTED,
      competitionId,
      entityId: score.id,
      entityVersion,
      actorId: user.id,
      payload: { teamId, scoreVersion: version, status },
      scope: 'team',
      teamId,
    });
    if (status === 'needs_review') {
      await this.realtime.publish({
        event: EVENT.SCORE_NEEDS_REVIEW,
        competitionId,
        entityId: score.id,
        actorId: user.id,
        payload: { teamId, scoreVersion: version, riskFlags: [...riskFlags] },
        scope: 'staff',
      });
    }
    return this.getScore(user, teamId, version);
  }

  /** 教师复核（approve / suggest_modify / insufficient），更新合成分与风险标记 */
  async review(user: AuthUser, teamId: string, scoreVersion: string, dto: ReviewScoreDto) {
    await this.assertTeacher(user, teamId);
    const score = await this.findScore(teamId, scoreVersion);
    const rubric = await this.loadRubric(score.rubricVersion);
    const dims = await this.prisma.scoreDimension.findMany({ where: { scoreId: score.id } });
    const dimMap = new Map(dims.map((d) => [d.dimensionKey, d]));

    for (const r of dto.dimensionReviews) {
      const dim = dimMap.get(r.dimensionKey);
      if (!dim) return validationError(`维度 ${r.dimensionKey} 不存在`);
      const dimDef = getDimension(rubric, r.dimensionKey);
      if (!dimDef || dimDef.source === 'system') {
        return validationError(`维度 ${r.dimensionKey} 为系统注入，不可复核`);
      }

      let teacherScore: number | null;
      if (r.action === 'approve') {
        teacherScore = dim.agentScore; // 保持 Agent 分
      } else if (r.action === 'suggest_modify') {
        if (r.score == null) return validationError('suggest_modify 必须提供 score');
        if (!r.reason || r.reason.trim().length < 10) {
          return validationError('suggest_modify 必须提供 ≥10 字 reason');
        }
        teacherScore = r.score;
      } else {
        // insufficient：材料不足，不计分，需补充资料后重评
        if (!r.reason || r.reason.trim().length < 10) {
          return validationError('insufficient 必须提供 ≥10 字 reason');
        }
        teacherScore = null;
      }

      const composite =
        teacherScore != null ? computeComposite(dim.agentScore ?? 0, teacherScore) : null;

      await this.prisma.scoreDimension.update({
        where: { id: dim.id },
        data: {
          teacherScore,
          teacherAction: r.action,
          teacherReason: r.reason,
          compositeScore: composite,
        },
      });
    }

    // 复核后重算整体风险
    await this.recomputeStatus(score.id, rubric);
    await this.audit.log({
      actorId: user.id,
      action: 'score.review',
      entityType: 'score',
      entityId: score.id,
      after: { scoreVersion, reviewedDimensions: dto.dimensionReviews.map((r) => r.dimensionKey) },
    });
    return this.getScore(user, teamId, scoreVersion);
  }

  /** 管理员批准：合成最终分（管理员二次确认门禁） */
  async approve(user: AuthUser, teamId: string, scoreVersion: string) {
    if (!this.access.isAdmin(user)) forbidden();
    const score = await this.findScore(teamId, scoreVersion);
    const rubric = await this.loadRubric(score.rubricVersion);
    const dims = await this.prisma.scoreDimension.findMany({ where: { scoreId: score.id } });

    const compositeByDimension: Record<string, number> = {};
    for (const d of dims) {
      let composite: number;
      if (d.compositeScore != null) composite = Number(d.compositeScore);
      else if (d.dimensionKey === 'submit_speed') composite = d.agentScore ?? 0;
      else composite = computeComposite(d.agentScore ?? 0, d.teacherScore ?? d.agentScore ?? 0);
      compositeByDimension[d.dimensionKey] = composite;
    }

    const peerReviewScore = score.peerReviewScore != null ? Number(score.peerReviewScore) : 0;
    const finalScore = computeFinalScore(compositeByDimension, rubric, peerReviewScore);

    await this.prisma.score.update({
      where: { id: score.id },
      data: { finalScore, status: 'approved', approvedBy: user.id, approvedAt: new Date() },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'score.approve',
      entityType: 'score',
      entityId: score.id,
      after: { finalScore, status: 'approved' },
    });

    const team = await this.requireTeam(teamId);
    await this.realtime.publish({
      event: EVENT.SCORE_APPROVED,
      competitionId: team.competition.id,
      entityId: score.id,
      entityVersion: Number(scoreVersion.slice(1)) || 1,
      actorId: user.id,
      payload: { teamId, scoreVersion, finalScore },
      scope: 'team',
      teamId,
    });
    return this.getScore(user, teamId, scoreVersion);
  }

  /** 评分版本列表（队长/成员仅本队公开项） */
  async listScores(user: AuthUser, teamId: string) {
    const team = await this.requireTeam(teamId);
    const level = await this.viewLevel(user, team.competitionId);
    const where =
      level === 'published-only'
        ? { teamId, status: { in: ['approved', 'published'] } }
        : { teamId };
    const scores = await this.prisma.score.findMany({
      where,
      orderBy: { generatedAt: 'asc' },
      include: { dimensions: true },
    });
    return scores.map((s) => this.serializeScore(s));
  }

  /** 评分版本详情 */
  async getScore(user: AuthUser, teamId: string, scoreVersion: string) {
    const team = await this.requireTeam(teamId);
    const level = await this.viewLevel(user, team.competitionId);
    const score = await this.prisma.score.findUnique({
      where: { teamId_scoreVersion: { teamId, scoreVersion } },
      include: { dimensions: true },
    });
    if (!score) notFound('评分版本不存在');
    if (level === 'published-only' && !['approved', 'published'].includes(score.status)) {
      notFound('评分版本不存在');
    }
    return this.serializeScore(score);
  }

  /** 证据列表（教师/管理员） */
  async listEvidence(user: AuthUser, teamId: string) {
    await this.assertCanScore(user, teamId);
    return this.prisma.evidence.findMany({
      where: { teamId },
      orderBy: { extractedAt: 'desc' },
    });
  }

  // ── 权限与辅助 ─────────────────────────────────────────────

  private async assertCanScore(user: AuthUser, teamId: string) {
    const team = await this.requireTeam(teamId);
    const role = await this.access.resolve(user, team.competitionId);
    if (role.isAdmin || role.isTeacher) return;
    forbidden('无评分权限');
  }

  private async assertTeacher(user: AuthUser, teamId: string) {
    const team = await this.requireTeam(teamId);
    const role = await this.access.resolve(user, team.competitionId);
    if (role.isAdmin || role.isTeacher) return;
    forbidden('无复核权限');
  }

  private async viewLevel(
    user: AuthUser,
    competitionId: string,
  ): Promise<'all' | 'published-only'> {
    const role = await this.access.resolve(user, competitionId);
    if (role.isAdmin || role.isTeacher) return 'all';
    if (role.teamId) return 'published-only';
    notFound('团队不存在');
  }

  private async requireTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { competition: { select: { id: true, rubricVersion: true, submitDeadline: true } } },
    });
    if (!team) notFound('团队不存在');
    return team;
  }

  private async findScore(teamId: string, scoreVersion: string) {
    const score = await this.prisma.score.findUnique({
      where: { teamId_scoreVersion: { teamId, scoreVersion } },
    });
    if (!score) notFound('评分版本不存在');
    return score;
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

  private async nextVersion(teamId: string): Promise<string> {
    const count = await this.prisma.score.count({ where: { teamId } });
    return `v${count + 1}`;
  }

  private async inputVersion(teamId: string): Promise<string> {
    const sub = await this.prisma.teamSubmission.findFirst({
      where: { teamId },
      orderBy: { version: 'desc' },
    });
    return `team-${teamId}@sub${sub?.version ?? 0}`;
  }

  /** 复核后重算整体风险标记并更新状态 */
  private async recomputeStatus(scoreId: string, rubric: RubricDefinition) {
    const dims = await this.prisma.scoreDimension.findMany({ where: { scoreId } });
    const flags = new Set<string>();
    for (const d of dims) {
      const confidence = d.agentConfidence != null ? Number(d.agentConfidence) : null;
      if (confidence != null && confidence < rubric.thresholds.confidenceMin) {
        flags.add('low_confidence');
      }
      if (d.agentScore != null && d.teacherScore != null) {
        const diff = Math.abs(d.agentScore - d.teacherScore);
        if (diff > rubric.thresholds.agentTeacherDiff) flags.add('agent_teacher_diff');
        if (d.agentScore !== 0 && diff / d.agentScore > rubric.thresholds.teacherModifyRatio) {
          flags.add('teacher_modified_over_ratio');
        }
      }
    }
    const existing = await this.prisma.score.findUnique({ where: { id: scoreId } });
    const existingFlags = (existing?.riskFlags as string[] | undefined) ?? [];
    if (existingFlags.includes('unresolved_evidence')) flags.add('unresolved_evidence');

    const status = flags.size > 0 ? 'needs_review' : 'agent_scored';
    await this.prisma.score.update({
      where: { id: scoreId },
      data: { status, riskFlags: [...flags] },
    });
  }

  /** 把含 Decimal 的评分对象序列化为 JSON 安全的数字 */
  private serializeScore(score: Score & { dimensions: ScoreDimension[] }) {
    const num = (v: unknown) => (v == null ? null : Number(v));
    return {
      id: score.id,
      teamId: score.teamId,
      scoreVersion: score.scoreVersion,
      rubricVersion: score.rubricVersion,
      inputVersion: score.inputVersion,
      finalScore: num(score.finalScore),
      peerReviewScore: num(score.peerReviewScore),
      status: score.status,
      riskFlags: score.riskFlags,
      modelVersion: score.modelVersion,
      promptVersion: score.promptVersion,
      generatedAt: score.generatedAt,
      approvedAt: score.approvedAt,
      dimensions: score.dimensions.map((d) => ({
        dimensionKey: d.dimensionKey,
        agentScore: d.agentScore,
        agentConfidence: num(d.agentConfidence),
        agentEvidence: d.agentEvidence,
        subScores: d.subScores,
        highlight: d.highlight,
        suggestion: d.suggestion,
        teacherScore: d.teacherScore,
        teacherAction: d.teacherAction,
        teacherReason: d.teacherReason,
        compositeScore: num(d.compositeScore),
      })),
    };
  }
}
