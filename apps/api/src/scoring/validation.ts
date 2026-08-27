/**
 * 评分维度校验与风险标记（纯函数）。
 * 服务端强制校验，客户端篡改权重/分数/越界时拒绝（PRD 验收项）。
 */

import type { DimensionDef, RubricDefinition, Thresholds } from './rubric.types';
import { getDimension } from './rubric.types';

/** 单维度评分输入的校验上下文（来自 Agent 结构化输出） */
export interface DimensionScoreInput {
  dimensionKey: string;
  agentScore: number;
  agentConfidence: number | null;
  evidenceIds: string[];
  highlight: string;
  suggestion: string;
  /** 报告质量等维度的子项分，键来自 rubrics.subs */
  subScores?: Record<string, number>;
}

/** 校验单个维度，返回错误信息数组（空 = 通过） */
export function validateDimensionScore(
  input: DimensionScoreInput,
  rubric: RubricDefinition,
): string[] {
  const errors: string[] = [];
  const dim = getDimension(rubric, input.dimensionKey);

  if (!dim) {
    errors.push(`未知维度: ${input.dimensionKey}`);
    return errors;
  }

  if (!Number.isInteger(input.agentScore) || input.agentScore < 0 || input.agentScore > 100) {
    errors.push(`${input.dimensionKey}.agentScore 必须是 0–100 的整数`);
  }

  if (input.agentConfidence != null) {
    const c = input.agentConfidence;
    if (c < 0 || c > 1) {
      errors.push(`${input.dimensionKey}.agentConfidence 必须在 0–1 之间`);
    }
  }

  // 仅 Agent 评分维度要求亮点/建议（系统注入维度无评语）
  if (dim.source === 'agent') {
    if (input.highlight.length < rubric.commentRules.minHighlightChars) {
      errors.push(
        `${input.dimensionKey}.highlight 至少 ${rubric.commentRules.minHighlightChars} 字`,
      );
    }
    if (input.suggestion.length < rubric.commentRules.minSuggestionChars) {
      errors.push(
        `${input.dimensionKey}.suggestion 至少 ${rubric.commentRules.minSuggestionChars} 字`,
      );
    }
  }

  // 子项分：键必须是该维度声明的 subs，值必须 0–100
  if (input.subScores) {
    for (const [subKey, subScore] of Object.entries(input.subScores)) {
      if (!dim.subs?.includes(subKey)) {
        errors.push(`${input.dimensionKey} 子项 ${subKey} 不在 rubric.subs 中`);
      }
      if (!Number.isInteger(subScore) || subScore < 0 || subScore > 100) {
        errors.push(`${input.dimensionKey}.${subKey} 子项分必须是 0–100 的整数`);
      }
    }
  }

  return errors;
}

/** 找出引用但不存在的证据 id（对应 EVIDENCE_UNRESOLVED） */
export function findMissingEvidence(evidenceIds: string[], existingIds: Set<string>): string[] {
  return evidenceIds.filter((id) => !existingIds.has(id));
}

/** 教师复核输入的风险输入 */
export interface RiskInput {
  confidence: number | null;
  agentScore: number | null;
  teacherScore: number | null;
  thresholds: Thresholds;
}

/** 依据阈值计算单维风险标记（PRD §5.3） */
export function computeRiskFlags(input: RiskInput): string[] {
  const flags: string[] = [];
  const { confidence, agentScore, teacherScore, thresholds } = input;

  if (confidence != null && confidence < thresholds.confidenceMin) {
    flags.push('low_confidence');
  }

  if (agentScore != null && teacherScore != null) {
    const diff = Math.abs(agentScore - teacherScore);
    if (diff > thresholds.agentTeacherDiff) {
      flags.push('agent_teacher_diff');
    }
    if (agentScore !== 0 && diff / agentScore > thresholds.teacherModifyRatio) {
      flags.push('teacher_modified_over_ratio');
    }
  }

  return flags;
}

/** 是否存在触发 needs_review 的风险标记 */
export function requiresReview(flags: string[]): boolean {
  return flags.length > 0;
}

/** 从维度定义里取子项 key 列表（数据驱动） */
export function subKeysOf(dim: DimensionDef | undefined): string[] {
  return dim?.subs ?? [];
}
