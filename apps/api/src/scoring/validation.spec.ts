import { describe, expect, it } from 'vitest';
import { POC_RUBRIC_DEFINITION } from './rubric-defaults';
import {
  computeRiskFlags,
  findMissingEvidence,
  requiresReview,
  validateDimensionScore,
} from './validation';

const rubric = POC_RUBRIC_DEFINITION;

describe('validateDimensionScore', () => {
  const base = {
    dimensionKey: 'report_quality',
    agentScore: 88,
    agentConfidence: 0.9,
    evidenceIds: ['DOC-REPORT-001'],
    highlight: '报告结构清晰完整且层次分明',
    suggestion: '可补充性能测试与安全章节',
  };

  it('合法输入 → 无错误', () => {
    expect(validateDimensionScore(base, rubric)).toEqual([]);
  });

  it('分数越界（>100）→ 报错', () => {
    expect(validateDimensionScore({ ...base, agentScore: 101 }, rubric).length).toBeGreaterThan(0);
  });

  it('分数非整数 → 报错', () => {
    expect(validateDimensionScore({ ...base, agentScore: 88.5 }, rubric).length).toBeGreaterThan(0);
  });

  it('置信度越界 → 报错', () => {
    expect(
      validateDimensionScore({ ...base, agentConfidence: 1.2 }, rubric).length,
    ).toBeGreaterThan(0);
  });

  it('亮点不足 10 字 → 报错', () => {
    expect(validateDimensionScore({ ...base, highlight: '好' }, rubric).length).toBeGreaterThan(0);
  });

  it('未知维度 → 报错', () => {
    expect(
      validateDimensionScore({ ...base, dimensionKey: 'nope' }, rubric).length,
    ).toBeGreaterThan(0);
  });

  it('子项 key 不在 rubric.subs → 报错', () => {
    expect(
      validateDimensionScore({ ...base, subScores: { bogus: 80 } }, rubric).length,
    ).toBeGreaterThan(0);
  });

  it('合法子项分 → 通过', () => {
    const ok = validateDimensionScore(
      { ...base, subScores: { completeness: 90, structure: 85 } },
      rubric,
    );
    expect(ok).toEqual([]);
  });

  it('系统注入维度不要求评语', () => {
    const sys = {
      dimensionKey: 'submit_speed',
      agentScore: 70,
      agentConfidence: null,
      evidenceIds: [],
      highlight: '',
      suggestion: '',
    };
    expect(validateDimensionScore(sys, rubric)).toEqual([]);
  });
});

describe('findMissingEvidence', () => {
  it('返回缺失的 evidence_id', () => {
    const existing = new Set(['DOC-REPORT-001']);
    expect(findMissingEvidence(['DOC-REPORT-001', 'DOC-REPORT-002'], existing)).toEqual([
      'DOC-REPORT-002',
    ]);
  });
});

describe('computeRiskFlags / requiresReview', () => {
  const thresholds = rubric.thresholds;

  it('无风险 → 空标记', () => {
    expect(
      computeRiskFlags({ confidence: 0.9, agentScore: 80, teacherScore: 82, thresholds }),
    ).toEqual([]);
  });

  it('低置信度 → low_confidence', () => {
    const flags = computeRiskFlags({
      confidence: 0.6,
      agentScore: 80,
      teacherScore: 82,
      thresholds,
    });
    expect(flags).toContain('low_confidence');
  });

  it('Agent 与教师差 >20 → agent_teacher_diff', () => {
    const flags = computeRiskFlags({
      confidence: 0.9,
      agentScore: 60,
      teacherScore: 85,
      thresholds,
    });
    expect(flags).toContain('agent_teacher_diff');
  });

  it('修改幅度 >20% → teacher_modified_over_ratio', () => {
    const flags = computeRiskFlags({
      confidence: 0.9,
      agentScore: 50,
      teacherScore: 62,
      thresholds,
    });
    expect(flags).toContain('teacher_modified_over_ratio');
  });

  it('requiresReview 命中任一风险即 true', () => {
    expect(requiresReview(['low_confidence'])).toBe(true);
    expect(requiresReview([])).toBe(false);
  });
});

describe('边界用例补充', () => {
  const thresholds = rubric.thresholds;

  it('教师分 null（未复核）时仅判断置信度，不产生分差标记', () => {
    const flags = computeRiskFlags({
      confidence: 0.9,
      agentScore: 80,
      teacherScore: null,
      thresholds,
    });
    expect(flags).toEqual([]);
    const low = computeRiskFlags({
      confidence: 0.5,
      agentScore: 80,
      teacherScore: null,
      thresholds,
    });
    expect(low).toEqual(['low_confidence']);
  });

  it('Agent 分 0 时修改幅度不除零', () => {
    // diff=10 未超 20，且 agentScore===0 跳过 ratio，避免 NaN
    const flags = computeRiskFlags({
      confidence: 0.9,
      agentScore: 0,
      teacherScore: 10,
      thresholds,
    });
    expect(flags).toEqual([]);
  });

  it('置信度 null 不产生 low_confidence', () => {
    const flags = computeRiskFlags({
      confidence: null,
      agentScore: 80,
      teacherScore: 82,
      thresholds,
    });
    expect(flags).toEqual([]);
  });

  it('validateDimensionScore：负分报错', () => {
    const base = {
      dimensionKey: 'report_quality',
      agentScore: -1,
      agentConfidence: 0.9,
      evidenceIds: [],
      highlight: '报告结构清晰完整且层次分明',
      suggestion: '可补充性能测试与安全章节',
    };
    expect(validateDimensionScore(base, rubric).length).toBeGreaterThan(0);
  });

  it('validateDimensionScore：子项分越界报错', () => {
    const base = {
      dimensionKey: 'report_quality',
      agentScore: 88,
      agentConfidence: 0.9,
      evidenceIds: [],
      highlight: '报告结构清晰完整且层次分明',
      suggestion: '可补充性能测试与安全章节',
      subScores: { completeness: 101 },
    };
    expect(validateDimensionScore(base, rubric).length).toBeGreaterThan(0);
  });
});
