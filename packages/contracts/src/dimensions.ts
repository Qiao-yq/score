/**
 * 评分维度与状态常量。
 * 注意：维度 key 是稳定标识；权重/子项/阈值**不在这里硬编码**，
 * 由 rubrics 表（rubric_version → definition）数据驱动，评分时注入 Agent。
 */

/** 前六维 + NO Push 互评维度 key（与 rubrics.definition 对齐） */
export type DimensionKey =
  | 'submit_speed'
  | 'report_quality'
  | 'interaction_visual'
  | 'function_experience'
  | 'tech_performance'
  | 'presentation'
  | 'peer_review';

/** 教师对单个维度的复核动作（PRD §5.3） */
export type TeacherAction = 'approve' | 'suggest_modify' | 'insufficient';

/** 评分状态流转（PRD §3） */
export type ScoreStatus =
  | 'not_started'
  | 'processing'
  | 'agent_scored'
  | 'needs_review'
  | 'approved'
  | 'published';

/** 评语可见性（PRD §5.2） */
export type CommentVisibility = 'captain' | 'all' | 'dashboard';

/** 团队状态（PRD §3） */
export type TeamStatus = 'draft' | 'submitted' | 'locked' | 'published';

/** 评语来源 */
export type CommentSource = 'agent' | 'teacher' | 'manual_fallback';
