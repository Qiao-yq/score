import { Injectable } from '@nestjs/common';
import type { ScoreDimension } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { forbidden, notFound } from '../common/errors';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { computeComposite, round1 } from '../scoring/formula';
import type { RubricDefinition } from '../scoring/rubric.types';
import { sanitizePii, tokenize, truncate } from './text-sanitize';

/** 大屏展示维度标签（展示层文案，非评分逻辑） */
const DIMENSION_LABELS: Record<string, string> = {
  submit_speed: '提交速度',
  report_quality: '报告质量',
  interaction_visual: '交互视觉',
  function_experience: '功能体验',
  tech_performance: '技术性能',
  presentation: '演示效果',
  peer_review: '团队互评',
};

/**
 * 大屏数据服务。唯一数据源：approved/published 评分 + visibility=dashboard 评语，
 * 服务端脱敏，前端不做二次放开（M1-06）。
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** 排名：最终分降序 + 排名升降（delta 暂无历史快照，占位 0） */
  async ranking(user: AuthUser, competitionId: string) {
    await this.assertCanViewDashboard(user, competitionId);

    const teams = await this.prisma.team.findMany({
      where: { competitionId },
      select: {
        id: true,
        name: true,
        projectName: true,
        scores: {
          where: { status: { in: ['approved', 'published'] } },
          orderBy: { generatedAt: 'desc' },
          take: 1,
          select: { finalScore: true, status: true, scoreVersion: true },
        },
      },
    });

    return teams
      .filter((t) => t.scores.length > 0 && t.scores[0].finalScore != null)
      .map((t) => ({
        teamId: t.id,
        name: t.name,
        projectName: t.projectName,
        scoreVersion: t.scores[0].scoreVersion,
        finalScore: Number(t.scores[0].finalScore),
        status: t.scores[0].status,
      }))
      .sort((a, b) => b.finalScore - a.finalScore || a.name.localeCompare(b.name))
      .map((t, i) => ({ ...t, rank: i + 1, delta: 0 }));
  }

  /** 雷达图：6 个需评分维度在已发布团队上的平均合成分 */
  async radar(user: AuthUser, competitionId: string) {
    await this.assertCanViewDashboard(user, competitionId);
    const competition = await this.requireCompetition(competitionId);
    const rubric = await this.prisma.rubric.findUnique({
      where: { rubricVersion: competition.rubricVersion },
    });
    const def = rubric?.definition as unknown as RubricDefinition | undefined;
    if (!def) return { dimensions: [], teamCount: 0 };

    const scores = await this.prisma.score.findMany({
      where: {
        team: { competitionId },
        status: { in: ['approved', 'published'] },
        finalScore: { not: null },
      },
      include: { dimensions: true },
      orderBy: { generatedAt: 'desc' },
    });

    const latestByTeam = new Map<string, (typeof scores)[number]>();
    for (const s of scores) if (!latestByTeam.has(s.teamId)) latestByTeam.set(s.teamId, s);

    const dimensions = def.dimensions
      .filter((d) => d.source !== 'no_push')
      .map((d) => {
        const values: number[] = [];
        for (const score of latestByTeam.values()) {
          const dim = score.dimensions.find((x) => x.dimensionKey === d.key);
          const composite = dim ? this.dimensionComposite(dim) : null;
          if (composite != null) values.push(composite);
        }
        const avg =
          values.length > 0 ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        return { key: d.key, label: DIMENSION_LABELS[d.key] ?? d.key, avg };
      });

    return { dimensions, teamCount: latestByTeam.size };
  }

  /** 进度：已提交 / 已出分 / 已批准团队数 */
  async progress(user: AuthUser, competitionId: string) {
    await this.assertCanViewDashboard(user, competitionId);
    const [totalTeams, scored, approved] = await Promise.all([
      this.prisma.team.count({
        where: { competitionId, status: { in: ['submitted', 'locked', 'published'] } },
      }),
      this.prisma.score.groupBy({ by: ['teamId'], where: { team: { competitionId } } }),
      this.prisma.score.groupBy({
        by: ['teamId'],
        where: { team: { competitionId }, status: { in: ['approved', 'published'] } },
      }),
    ]);
    return { totalTeams, scoredTeams: scored.length, approvedTeams: approved.length };
  }

  /** 词云：公示评语关键词频次（脱敏 + 停用词过滤） */
  async wordcloud(user: AuthUser, competitionId: string) {
    await this.assertCanViewDashboard(user, competitionId);
    const teamIds = await this.publishedTeamIds(competitionId);
    if (teamIds.length === 0) return [];

    const comments = await this.prisma.comment.findMany({
      where: { teamId: { in: teamIds }, visibility: 'dashboard' },
      select: { highlight: true, suggestion: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const freq = new Map<string, number>();
    for (const c of comments) {
      for (const token of tokenize(sanitizePii(`${c.highlight}\n${c.suggestion}`))) {
        freq.set(token, (freq.get(token) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 60);
  }

  /** 跑马灯：最新公示评语摘要（脱敏 ≤80 字） */
  async ticker(user: AuthUser, competitionId: string) {
    await this.assertCanViewDashboard(user, competitionId);
    const teamIds = await this.publishedTeamIds(competitionId);
    if (teamIds.length === 0) return [];

    const comments = await this.prisma.comment.findMany({
      where: { teamId: { in: teamIds }, visibility: 'dashboard' },
      select: { id: true, highlight: true, dimensionKey: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return comments.map((c) => ({
      id: c.id,
      dimensionKey: c.dimensionKey,
      text: truncate(sanitizePii(c.highlight), 80),
    }));
  }

  /** 桑基图（仅管理员）：互评映射关系 reviewer→target（匿名，不含分数/身份） */
  async sankey(user: AuthUser, competitionId: string) {
    if (!this.access.isAdmin(user)) forbidden('仅管理员可查看互评映射关系');

    const mapping = await this.prisma.peerReviewMapping.findFirst({
      where: { competitionId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    if (!mapping) return { nodes: [], links: [] };

    const edges = mapping.mapping as unknown as Array<{
      reviewerTeamId: string;
      targetTeamId: string;
    }>;
    const ids = [...new Set(edges.flatMap((e) => [e.reviewerTeamId, e.targetTeamId]))].sort();
    const nodes = ids.map((id, i) => ({ id, label: `团队 #${i + 1}` }));
    const links = edges.map((e) => ({ source: e.reviewerTeamId, target: e.targetTeamId }));
    return { nodes, links };
  }

  // ── 辅助 ───────────────────────────────────────────────────

  private async assertCanViewDashboard(user: AuthUser, competitionId: string) {
    const competition = await this.requireCompetition(competitionId);
    const role = await this.access.resolve(user, competitionId);
    if (role.isAdmin || role.isTeacher) return;
    if (competition.dashboardPublished) return;
    forbidden('大屏尚未发布');
  }

  private async requireCompetition(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) notFound('比赛不存在');
    return competition;
  }

  private async publishedTeamIds(competitionId: string): Promise<string[]> {
    const scores = await this.prisma.score.findMany({
      where: { team: { competitionId }, status: { in: ['approved', 'published'] } },
      select: { teamId: true },
      distinct: ['teamId'],
    });
    return scores.map((s) => s.teamId);
  }

  /** 维度合成分：优先已存 compositeScore，否则按公式回算（与 scoring.approve 同口径） */
  private dimensionComposite(d: ScoreDimension): number | null {
    if (d.compositeScore != null) return Number(d.compositeScore);
    if (d.dimensionKey === 'submit_speed') return d.agentScore ?? null;
    if (d.agentScore == null) return null;
    return computeComposite(d.agentScore, d.teacherScore ?? d.agentScore);
  }
}
