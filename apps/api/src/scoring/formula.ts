/**
 * 评分合成核心纯函数（无 DB / 无副作用，可独立单测）。
 * 公式（PRD §5.1）：
 *   维度合成分 = Agent分 × 0.7 + 教师分 × 0.3
 *   最终分     = Σ(前六维合成分 × 权重) + NO Push 互评分(0–5)
 * 提交速度由系统注入（不参与 0.7/0.3 合成，直接作为该维合成分）。
 */

import type { RubricDefinition, SubmitSpeedRule } from './rubric.types';

export const AGENT_WEIGHT = 0.7;
export const TEACHER_WEIGHT = 0.3;

/** 四舍五入到指定小数位 */
export function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

/** 四舍五入到 1 位小数（最终分口径） */
export function round1(n: number): number {
  return roundTo(n, 1);
}

/** 四舍五入到 2 位小数（维度合成分口径） */
export function round2(n: number): number {
  return roundTo(n, 2);
}

/** 单维合成分 = agent×0.7 + teacher×0.3 */
export function computeComposite(agentScore: number, teacherScore: number): number {
  return round2(agentScore * AGENT_WEIGHT + teacherScore * TEACHER_WEIGHT);
}

/**
 * 提交速度自动分（系统注入）。
 * linear_lead_time：提交越早得分越高，提前满 leadWindowHours 拿 maxScore，
 * 截止时刻或迟到拿 minScore，区间内线性插值。
 */
export function computeSubmitSpeedScore(
  submittedAt: Date,
  deadline: Date,
  rule: SubmitSpeedRule,
): number {
  const leadHours = (deadline.getTime() - submittedAt.getTime()) / 3_600_000;
  if (leadHours <= 0) return rule.minScore;
  const ratio = Math.min(1, leadHours / rule.leadWindowHours);
  return Math.round(rule.minScore + (rule.maxScore - rule.minScore) * ratio);
}

/**
 * 最终分 = Σ(前六维合成分 × 权重/100) + 互评分(0–5)。
 * @param compositeByDimension 维度 key → 合成分（submit_speed 为系统分，其余为 0.7/0.3 合成）
 * @param rubric 数据驱动的权重定义（跳过 no_push 维度）
 * @param peerReviewScore NO Push 互评得分 0–5，默认 0（M4 前未实现）
 */
export function computeFinalScore(
  compositeByDimension: Record<string, number>,
  rubric: RubricDefinition,
  peerReviewScore = 0,
): number {
  let sum = 0;
  for (const dim of rubric.dimensions) {
    if (dim.source === 'no_push') continue;
    const composite = compositeByDimension[dim.key] ?? 0;
    sum += (composite * dim.weight) / 100;
  }
  return round1(sum + peerReviewScore);
}

/** 权重求和（校验用：前六维 + 互评应 = 100） */
export function totalWeight(rubric: RubricDefinition): number {
  return rubric.dimensions.reduce((acc, d) => acc + d.weight, 0);
}
