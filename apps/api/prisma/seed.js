/**
 * 种子数据（幂等，可重复执行）。
 * 运行：npm run prisma:seed -w @task/api
 * 内容：admin/teacher/audience 用户 + poc-uncalibrated 判分标准 + 演示比赛与两支团队。
 *
 * 注意：poc-uncalibrated 是历史未标定版本，此处定义需与
 *       src/scoring/rubric-defaults.ts 的 POC_RUBRIC_DEFINITION 保持一致；
 *       后续新增 rubric 版本请新加记录，不要改动此版本定义。
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const POC_RUBRIC_VERSION = 'poc-uncalibrated';
const POC_RUBRIC_DEFINITION = {
  dimensions: [
    { key: 'submit_speed', weight: 10, source: 'system', subs: [] },
    {
      key: 'report_quality',
      weight: 30,
      source: 'agent',
      subs: ['completeness', 'structure', 'writing', 'depth'],
    },
    {
      key: 'interaction_visual',
      weight: 20,
      source: 'agent',
      subs: ['visual_design', 'interaction_fluency', 'accessibility'],
    },
    {
      key: 'function_experience',
      weight: 15,
      source: 'agent',
      subs: ['feature_completeness', 'usability', 'stability'],
    },
    {
      key: 'tech_performance',
      weight: 10,
      source: 'agent',
      subs: ['performance', 'security', 'code_quality'],
    },
    {
      key: 'presentation',
      weight: 10,
      source: 'agent',
      subs: ['clarity', 'structure', 'delivery'],
    },
    { key: 'peer_review', weight: 5, source: 'no_push', subs: [] },
  ],
  thresholds: { confidenceMin: 0.7, agentTeacherDiff: 20, teacherModifyRatio: 0.2 },
  submitSpeedRule: { type: 'linear_lead_time', leadWindowHours: 168, minScore: 40, maxScore: 100 },
  commentRules: { minHighlightChars: 10, minSuggestionChars: 10 },
};

const ID = {
  admin: '00000000-0000-0000-0000-000000000001',
  teacher: '00000000-0000-0000-0000-000000000002',
  audience: '00000000-0000-0000-0000-000000000003',
  captain1: '00000000-0000-0000-0000-000000000011',
  member1: '00000000-0000-0000-0000-000000000012',
  captain2: '00000000-0000-0000-0000-000000000021',
  member2: '00000000-0000-0000-0000-000000000022',
  rubric: '30000000-0000-0000-0000-000000000001',
  competition: '10000000-0000-0000-0000-000000000001',
  team1: '20000000-0000-0000-0000-000000000001',
  team2: '20000000-0000-0000-0000-000000000002',
};

const PASSWORD = 'Passw0rd!';

async function seedUser(id, email, name, globalRole) {
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    create: { id, email, name, passwordHash, globalRole },
    update: { name, globalRole, passwordHash },
  });
}

async function main() {
  await seedUser(ID.admin, 'admin@task.dev', '管理员', 'admin');
  await seedUser(ID.teacher, 'teacher@task.dev', '评审教师', 'teacher');
  await seedUser(ID.audience, 'audience@task.dev', '观众', 'audience');
  await seedUser(ID.captain1, 'captain1@task.dev', '队长甲', 'audience');
  await seedUser(ID.member1, 'member1@task.dev', '成员甲', 'audience');
  await seedUser(ID.captain2, 'captain2@task.dev', '队长乙', 'audience');
  await seedUser(ID.member2, 'member2@task.dev', '成员乙', 'audience');

  await prisma.rubric.upsert({
    where: { rubricVersion: POC_RUBRIC_VERSION },
    create: {
      id: ID.rubric,
      rubricVersion: POC_RUBRIC_VERSION,
      definition: POC_RUBRIC_DEFINITION,
      calibrated: false,
      createdBy: ID.admin,
    },
    update: { definition: POC_RUBRIC_DEFINITION },
  });

  await prisma.competition.upsert({
    where: { id: ID.competition },
    create: {
      id: ID.competition,
      name: '演示比赛 · 赛博作品展',
      timezone: 'Asia/Shanghai',
      submitDeadline: new Date('2026-09-15T23:59:59+08:00'),
      rubricVersion: POC_RUBRIC_VERSION,
      peerReviewEnabled: true,
      dashboardPublished: false,
      status: 'active',
      createdBy: ID.admin,
    },
    update: { rubricVersion: POC_RUBRIC_VERSION },
  });

  await prisma.competitionTeacher.upsert({
    where: { competitionId_userId: { competitionId: ID.competition, userId: ID.teacher } },
    create: { competitionId: ID.competition, userId: ID.teacher },
    update: {},
  });

  await prisma.team.upsert({
    where: { id: ID.team1 },
    create: {
      id: ID.team1,
      competitionId: ID.competition,
      name: '霓虹小队',
      projectName: '神经脉冲 · 可穿戴赛博终端',
      projectDescription: '一套赛博朋克风格的可穿戴交互终端原型。',
      status: 'draft',
    },
    update: {},
  });

  await prisma.team.upsert({
    where: { id: ID.team2 },
    create: {
      id: ID.team2,
      competitionId: ID.competition,
      name: '字节浪人',
      projectName: '矩阵守望 · 实时协作白板',
      projectDescription: '面向远程团队的赛博主题实时协作白板。',
      status: 'draft',
    },
    update: {},
  });

  const members = [
    [ID.team1, ID.captain1, 'captain'],
    [ID.team1, ID.member1, 'member'],
    [ID.team2, ID.captain2, 'captain'],
    [ID.team2, ID.member2, 'member'],
  ];

  for (const [teamId, userId, role] of members) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, role },
      update: { role },
    });
  }

  console.log('✅ seed 完成：用户/判分标准/比赛/团队已就绪（rubric=%s）', POC_RUBRIC_VERSION);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
