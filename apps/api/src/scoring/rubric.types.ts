/**
 * rubrics.definition 的类型定义。
 * 维度/权重/子项/阈值全部由 rubrics 表数据驱动，代码不做硬编码，
 * 调整判分标准 = 新增一条 rubric_version 记录，不改代码。
 */

/** 维度分值来源：system=系统注入，agent=Agent 评分，no_push=互评 */
export type DimensionSource = 'system' | 'agent' | 'no_push';

/** 单个维度定义 */
export interface DimensionDef {
  /** 稳定维度 key，如 report_quality / submit_speed */
  key: string;
  /** 百分比权重，0–100（前六维 + 互评合计 100） */
  weight: number;
  source: DimensionSource;
  /** 子项 key 列表（数据驱动，如报告质量子项） */
  subs?: string[];
}

/** 触发 needs_review 的阈值（未标定阶段为 poc 默认值） */
export interface Thresholds {
  /** Agent 置信度下限，低于则 needs_review */
  confidenceMin: number;
  /** Agent 与教师单维分差上限（绝对值） */
  agentTeacherDiff: number;
  /** 教师相对 Agent 的修改幅度上限（比例 0–1） */
  teacherModifyRatio: number;
}

/** 提交速度自动分规则（系统注入，Agent/教师不可改） */
export interface SubmitSpeedRule {
  type: 'linear_lead_time';
  /** 提前满该窗口小时数即得 maxScore */
  leadWindowHours: number;
  /** 截止时刻（或迟到）得分 */
  minScore: number;
  /** 提前 >= leadWindowHours 得分 */
  maxScore: number;
}

/** 评语校验规则 */
export interface CommentRules {
  minHighlightChars: number;
  minSuggestionChars: number;
}

/** rubrics.definition 的整体结构 */
export interface RubricDefinition {
  dimensions: DimensionDef[];
  thresholds: Thresholds;
  submitSpeedRule: SubmitSpeedRule;
  commentRules: CommentRules;
}

/** 便捷访问器：按 key 取维度定义 */
export function getDimension(rubric: RubricDefinition, key: string): DimensionDef | undefined {
  return rubric.dimensions.find((d) => d.key === key);
}
