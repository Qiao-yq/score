import type { RubricDefinition } from './rubric.types';

/** 当前未标定阶段的 rubric 版本号（M0.5 标定后另建版本） */
export const POC_RUBRIC_VERSION = 'poc-uncalibrated';

/**
 * 默认判分标准（poc-uncalibrated）。
 * 权重口径来自 PRD §5.1：提交速度 10 / 报告质量 30 / 交互视觉 20 /
 * 功能体验 15 / 技术性能 10 / 演示效果 10 / 团队互评 5。
 * 当前分值口径不重要，统一交由 Agent 出分；本定义仅作为种子数据落库。
 */
export const POC_RUBRIC_DEFINITION: RubricDefinition = {
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
  thresholds: {
    confidenceMin: 0.7,
    agentTeacherDiff: 20,
    teacherModifyRatio: 0.2,
  },
  submitSpeedRule: {
    type: 'linear_lead_time',
    leadWindowHours: 168,
    minScore: 40,
    maxScore: 100,
  },
  commentRules: {
    minHighlightChars: 10,
    minSuggestionChars: 10,
  },
};
