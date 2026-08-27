/**
 * 试点数据（试运行/大屏演示用，幂等：先清空本比赛试点数据再重建）。
 * 运行：npm run prisma:seed:pilot -w @task/api
 * 前置：已执行 prisma:seed（用户/判分标准/比赛/团队）。
 * 内容：两支团队提交 → 证据 → 已批准评分（6 维）→ 公示评语 → 互评映射。
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ID = {
  admin: '00000000-0000-0000-0000-000000000001',
  captain1: '00000000-0000-0000-0000-000000000011',
  captain2: '00000000-0000-0000-0000-000000000021',
  competition: '10000000-0000-0000-0000-000000000001',
  team1: '20000000-0000-0000-0000-000000000001',
  team2: '20000000-0000-0000-0000-000000000002',
  mapping: '40000000-0000-0000-0000-000000000001',
};

const POC_RUBRIC_VERSION = 'poc-uncalibrated';

/** 前六维权重（与 rubric 一致，仅用于试点数据计算最终分） */
const WEIGHTS = {
  submit_speed: 10,
  report_quality: 30,
  interaction_visual: 20,
  function_experience: 15,
  tech_performance: 10,
  presentation: 10,
};

function round1(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function computeFinal(composites, peerScore) {
  let sum = 0;
  for (const [k, v] of Object.entries(composites)) sum += (v * WEIGHTS[k]) / 100;
  return round1(sum + peerScore);
}

/** 团队试点评分：Agent 分（教师未改，合成=Agent 分）+ 收到的互评分 */
const TEAMS = [
  {
    id: ID.team1,
    name: '霓虹小队',
    submittedAt: new Date('2026-09-01T10:00:00+08:00'),
    peerScore: 3.6,
    dims: {
      submit_speed: 92,
      report_quality: 88,
      interaction_visual: 85,
      function_experience: 80,
      tech_performance: 78,
      presentation: 82,
    },
  },
  {
    id: ID.team2,
    name: '字节浪人',
    submittedAt: new Date('2026-09-10T18:00:00+08:00'),
    peerScore: 3.5,
    dims: {
      submit_speed: 70,
      report_quality: 82,
      interaction_visual: 90,
      function_experience: 75,
      tech_performance: 85,
      presentation: 78,
    },
  },
];

/** 公示评语（visibility=dashboard，供大屏词云/跑马灯） */
const DASHBOARD_COMMENTS = {
  [ID.team1]: [
    {
      dimensionKey: 'interaction_visual',
      highlight: '交互视觉风格统一，故障艺术与暗色主题层次分明，动效克制不干扰阅读',
      suggestion: '可在移动端进一步收紧触控热区与字号对比',
    },
    {
      dimensionKey: 'report_quality',
      highlight: '报告结构清晰完整，性能测试章节数据翔实，安全设计论证充分',
      suggestion: '建议补充用户画像与可用性测试结论',
    },
  ],
  [ID.team2]: [
    {
      dimensionKey: 'interaction_visual',
      highlight: '实时协作白板视觉惊艳，矩阵守望主题贯穿一致，光标联动流畅',
      suggestion: '弱网下的降级提示与冲突合并策略可以更明确',
    },
    {
      dimensionKey: 'tech_performance',
      highlight: '性能优化到位，长连接稳定，代码分层清晰，测试覆盖率高',
      suggestion: '补充压测报告与容量评估',
    },
  ],
};

async function clearPilot() {
  await prisma.peerReview.deleteMany({ where: { competitionId: ID.competition } });
  await prisma.peerReviewMapping.deleteMany({ where: { competitionId: ID.competition } });
  await prisma.comment.deleteMany({ where: { teamId: { in: [ID.team1, ID.team2] } } });
  await prisma.score.deleteMany({ where: { teamId: { in: [ID.team1, ID.team2] } } });
  await prisma.evidence.deleteMany({ where: { teamId: { in: [ID.team1, ID.team2] } } });
  await prisma.teamSubmission.deleteMany({ where: { teamId: { in: [ID.team1, ID.team2] } } });
}

async function seedTeam(team) {
  // 1. 团队提交
  await prisma.team.update({
    where: { id: team.id },
    data: { status: 'submitted', submittedAt: team.submittedAt },
  });

  await prisma.teamSubmission.create({
    data: {
      teamId: team.id,
      version: 1,
      snapshot: {
        projectName: `试点项目-${team.name}`,
        reportUrl: `https://example.com/${team.id}/report.pdf`,
        prototypeUrl: `https://example.com/${team.id}/prototype`,
        submittedAt: team.submittedAt.toISOString(),
      },
    },
  });

  // 2. 证据
  await prisma.evidence.createMany({
    data: [
      {
        evidenceId: `DOC-REPORT-${team.id.slice(0, 4)}`,
        competitionId: ID.competition,
        teamId: team.id,
        dimension: 'report_quality',
        materialType: 'pdf',
        locator: { page: 2, section: '性能测试' },
      },
      {
        evidenceId: `PROTO-${team.id.slice(0, 4)}`,
        competitionId: ID.competition,
        teamId: team.id,
        dimension: 'interaction_visual',
        materialType: 'online_prototype',
        locator: { url: `https://example.com/${team.id}/prototype`, path: ['首页', '作品详情'] },
      },
    ],
  });

  // 3. 评分（approved）+ 6 维 + 公示评语
  const finalScore = computeFinal(team.dims, team.peerScore);
  const score = await prisma.score.create({
    data: {
      teamId: team.id,
      scoreVersion: 'v1',
      rubricVersion: POC_RUBRIC_VERSION,
      inputVersion: `team-${team.id}@sub1`,
      finalScore,
      peerReviewScore: team.peerScore,
      status: 'approved',
      riskFlags: [],
      modelVersion: 'poc-seed',
      promptVersion: 'v1',
      approvedBy: ID.admin,
      approvedAt: new Date(),
      createdBy: ID.admin,
    },
  });

  const dimensionRows = Object.entries(team.dims).map(([key, agentScore]) => {
    const isSystem = key === 'submit_speed';
    const subs =
      key === 'report_quality'
        ? {
            completeness: Math.min(100, agentScore + 2),
            structure: agentScore,
            writing: Math.max(0, agentScore - 1),
            depth: agentScore,
          }
        : undefined;
    return {
      scoreId: score.id,
      dimensionKey: key,
      agentScore,
      agentConfidence: isSystem ? 1.0 : 0.9,
      agentEvidence: isSystem
        ? []
        : [`DOC-REPORT-${team.id.slice(0, 4)}`, `PROTO-${team.id.slice(0, 4)}`],
      subScores: subs ?? undefined,
      highlight: isSystem ? null : `试点亮点：${key} 表现突出`,
      suggestion: isSystem ? null : `试点建议：${key} 可进一步打磨`,
      teacherScore: agentScore,
      teacherAction: 'approve',
      compositeScore: agentScore,
    };
  });
  await prisma.scoreDimension.createMany({ data: dimensionRows });

  // 4. 公示评语
  const comments = (DASHBOARD_COMMENTS[team.id] ?? []).map((c) => ({
    teamId: team.id,
    dimensionKey: c.dimensionKey,
    scoreVersion: 'v1',
    highlight: c.highlight,
    suggestion: c.suggestion,
    tags: [],
    visibility: 'dashboard',
    source: 'agent',
    createdBy: ID.admin,
  }));
  if (comments.length > 0) await prisma.comment.createMany({ data: comments });

  return finalScore;
}

async function seedPeerReview() {
  // 拒绝采样 derangement 的 2-cycle：team1↔team2（仅禁自评，允许成对互评）
  const mapping = [
    { reviewerTeamId: ID.team1, targetTeamId: ID.team2 },
    { reviewerTeamId: ID.team2, targetTeamId: ID.team1 },
  ];
  const created = await prisma.peerReviewMapping.create({
    data: {
      id: ID.mapping,
      competitionId: ID.competition,
      algorithmVersion: 'derangement-v1',
      mapping,
      status: 'active',
      createdBy: ID.admin,
    },
  });

  await prisma.peerReview.createMany({
    data: [
      {
        competitionId: ID.competition,
        mappingId: created.id,
        reviewerTeamId: ID.team1,
        targetTeamId: ID.team2,
        score: 70,
        status: 'valid',
        submittedBy: ID.captain1,
      },
      {
        competitionId: ID.competition,
        mappingId: created.id,
        reviewerTeamId: ID.team2,
        targetTeamId: ID.team1,
        score: 72,
        status: 'valid',
        submittedBy: ID.captain2,
      },
    ],
  });
}

async function main() {
  await clearPilot();

  for (const team of TEAMS) {
    const final = await seedTeam(team);
    console.log('  %s finalScore=%s peer=%s', team.name, final, team.peerScore);
  }

  await seedPeerReview();

  // 打开大屏发布开关（观众可看）
  await prisma.competition.update({
    where: { id: ID.competition },
    data: { dashboardPublished: true },
  });

  console.log(
    '✅ 试点数据完成：2 队已提交并批准评分 + 公示评语 + 互评映射（dashboardPublished=true）',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
