import { describe, expect, it } from 'vitest';
import { POC_RUBRIC_DEFINITION } from './rubric-defaults';
import {
  computeComposite,
  computeFinalScore,
  computeSubmitSpeedScore,
  round1,
  round2,
  totalWeight,
} from './formula';

describe('computeComposite', () => {
  it('Agent=80, 教师=90 → 80*0.7 + 90*0.3 = 83.00', () => {
    expect(computeComposite(80, 90)).toBe(83);
  });

  it('默认教师分=Agent 分时，合成=Agent 分', () => {
    expect(computeComposite(75, 75)).toBe(75);
  });

  it('保留 2 位小数', () => {
    // 83*0.7 + 90*0.3 = 58.1 + 27 = 85.1
    expect(computeComposite(83, 90)).toBe(85.1);
  });
});

describe('computeSubmitSpeedScore (linear_lead_time)', () => {
  const deadline = new Date('2026-08-01T00:00:00Z');
  const rule = {
    type: 'linear_lead_time' as const,
    leadWindowHours: 168,
    minScore: 40,
    maxScore: 100,
  };

  it('提前满窗口 → maxScore', () => {
    const submitted = new Date(deadline.getTime() - 168 * 3_600_000);
    expect(computeSubmitSpeedScore(submitted, deadline, rule)).toBe(100);
  });

  it('截止时刻 → minScore', () => {
    expect(computeSubmitSpeedScore(deadline, deadline, rule)).toBe(40);
  });

  it('迟到 → minScore（不越界）', () => {
    const late = new Date(deadline.getTime() + 3_600_000);
    expect(computeSubmitSpeedScore(late, deadline, rule)).toBe(40);
  });

  it('提前一半窗口 → 中间分（40 + 60*0.5 = 70）', () => {
    const submitted = new Date(deadline.getTime() - 84 * 3_600_000);
    expect(computeSubmitSpeedScore(submitted, deadline, rule)).toBe(70);
  });
});

describe('computeFinalScore', () => {
  const rubric = POC_RUBRIC_DEFINITION;

  it('各维度满分 + 互评 5 分 → 100', () => {
    const composite = {
      submit_speed: 100,
      report_quality: 100,
      interaction_visual: 100,
      function_experience: 100,
      tech_performance: 100,
      presentation: 100,
    };
    expect(computeFinalScore(composite, rubric, 5)).toBe(100);
  });

  it('权重正确：仅报告质量满分(30%) → 30', () => {
    const composite = {
      submit_speed: 0,
      report_quality: 100,
      interaction_visual: 0,
      function_experience: 0,
      tech_performance: 0,
      presentation: 0,
    };
    expect(computeFinalScore(composite, rubric, 0)).toBe(30);
  });

  it('互评默认 0', () => {
    const composite = {
      submit_speed: 50,
      report_quality: 50,
      interaction_visual: 50,
      function_experience: 50,
      tech_performance: 50,
      presentation: 50,
    };
    // 前六维权重合计 95，各 50 分 → 47.5
    expect(computeFinalScore(composite, rubric)).toBe(47.5);
  });

  it('缺失维度按 0 计，不抛异常', () => {
    expect(computeFinalScore({}, rubric, 0)).toBe(0);
  });
});

describe('round1 / round2 / totalWeight', () => {
  it('round1 四舍五入', () => {
    expect(round1(47.55)).toBe(47.6);
    expect(round1(47.54)).toBe(47.5);
  });
  it('round2 四舍五入', () => {
    expect(round2(83.005)).toBe(83.01);
  });
  it('权重合计 = 100', () => {
    expect(totalWeight(POC_RUBRIC_DEFINITION)).toBe(100);
  });
});

describe('边界用例补充', () => {
  const rule = {
    type: 'linear_lead_time' as const,
    leadWindowHours: 168,
    minScore: 40,
    maxScore: 100,
  };
  const deadline = new Date('2026-08-01T00:00:00Z');

  it('提交速度非整数插值四舍五入', () => {
    // 提前 100h → ratio=100/168 → 40 + 60*0.5952 = 75.71 → 76
    const submitted = new Date(deadline.getTime() - 100 * 3_600_000);
    expect(computeSubmitSpeedScore(submitted, deadline, rule)).toBe(76);
  });

  it('提交速度提前 1 小时 → 仍接近 minScore', () => {
    const submitted = new Date(deadline.getTime() - 3_600_000);
    expect(computeSubmitSpeedScore(submitted, deadline, rule)).toBe(40);
  });

  it('computeComposite 小数值不丢精度', () => {
    expect(computeComposite(1, 2)).toBe(1.3); // 0.7 + 0.6
  });

  it('computeFinalScore 小数互评分参与并四舍五入', () => {
    const composite = {
      submit_speed: 90,
      report_quality: 80,
      interaction_visual: 85,
      function_experience: 75,
      tech_performance: 70,
      presentation: 88,
    };
    // 前六维加权和 + 3.5（互评）
    const withoutPeer = computeFinalScore(composite, POC_RUBRIC_DEFINITION, 0);
    const withPeer = computeFinalScore(composite, POC_RUBRIC_DEFINITION, 3.5);
    expect(withPeer).toBeCloseTo(withoutPeer + 3.5, 1);
  });
});
