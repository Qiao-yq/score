import { describe, expect, it } from 'vitest';
import {
  aggregatePeerScore,
  buildMapping,
  detectAnomaly,
  generateDerangement,
  validateBijection,
  type MappingEdge,
} from './no-push';

/** 确定性 LCG，供单测复现随机结果 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('generateDerangement', () => {
  it('n<2 返回空', () => {
    expect(generateDerangement([], lcg(1))).toEqual([]);
    expect(generateDerangement(['a'], lcg(1))).toEqual([]);
  });

  it.each([2, 3, 4, 5, 6, 7])('n=%d 无自评且为原集合的排列', (n) => {
    const items = Array.from({ length: n }, (_, i) => `t${i}`);
    const perm = generateDerangement(items, lcg(n));
    expect(perm).toHaveLength(n);
    expect([...perm].sort()).toEqual([...items].sort()); // 是排列
    expect(perm.every((v, i) => v !== items[i])).toBe(true); // 无自评
  });
});

describe('buildMapping', () => {
  it('少于 2 队 → null（关闭互评）', () => {
    expect(buildMapping([], lcg(1))).toBeNull();
    expect(buildMapping(['a'], lcg(1))).toBeNull();
  });

  it.each([2, 3, 4, 5, 6])('n=%d 生成合法双射（无自评/无重复/全覆盖）', (n) => {
    const teamIds = Array.from({ length: n }, (_, i) => `team-${i}`);
    const mapping = buildMapping(teamIds, lcg(n));
    expect(mapping).not.toBeNull();
    expect(mapping).toHaveLength(n);
    expect(validateBijection(mapping as MappingEdge[], teamIds)).toEqual([]);
  });

  it('双射性：每队 out-degree=1 且 in-degree=1', () => {
    const teamIds = ['a', 'b', 'c', 'd', 'e'];
    const mapping = buildMapping(teamIds, lcg(42)) as MappingEdge[];
    const reviewers = mapping.map((e) => e.reviewerTeamId);
    const targets = mapping.map((e) => e.targetTeamId);
    expect(new Set(reviewers).size).toBe(teamIds.length);
    expect(new Set(targets).size).toBe(teamIds.length);
  });
});

describe('validateBijection', () => {
  const teams = ['a', 'b', 'c'];

  it('合法映射 → 空', () => {
    const mapping: MappingEdge[] = [
      { reviewerTeamId: 'a', targetTeamId: 'b' },
      { reviewerTeamId: 'b', targetTeamId: 'c' },
      { reviewerTeamId: 'c', targetTeamId: 'a' },
    ];
    expect(validateBijection(mapping, teams)).toEqual([]);
  });

  it('自评 → self_mapping', () => {
    const mapping: MappingEdge[] = [
      { reviewerTeamId: 'a', targetTeamId: 'a' },
      { reviewerTeamId: 'b', targetTeamId: 'c' },
      { reviewerTeamId: 'c', targetTeamId: 'b' },
    ];
    expect(validateBijection(mapping, teams)).toContain('self_mapping');
  });

  it('重复 target → duplicate_target', () => {
    const mapping: MappingEdge[] = [
      { reviewerTeamId: 'a', targetTeamId: 'b' },
      { reviewerTeamId: 'b', targetTeamId: 'b' },
      { reviewerTeamId: 'c', targetTeamId: 'a' },
    ];
    expect(validateBijection(mapping, teams)).toContain('duplicate_target');
  });

  it('未覆盖 → uncovered_team', () => {
    const mapping: MappingEdge[] = [
      { reviewerTeamId: 'a', targetTeamId: 'b' },
      { reviewerTeamId: 'b', targetTeamId: 'a' },
    ];
    expect(validateBijection(mapping, teams)).toContain('uncovered_team');
  });
});

describe('detectAnomaly', () => {
  const good: MappingEdge[] = [
    { reviewerTeamId: 'a', targetTeamId: 'b' },
    { reviewerTeamId: 'b', targetTeamId: 'a' },
  ];

  it('合法输入 → 空', () => {
    expect(detectAnomaly(80, good, ['a', 'b'])).toEqual([]);
  });

  it('分数越界/非整数 → score_out_of_range', () => {
    expect(detectAnomaly(101, good, ['a', 'b'])).toContain('score_out_of_range');
    expect(detectAnomaly(88.5, good, ['a', 'b'])).toContain('score_out_of_range');
  });

  it('自评映射 → self_mapping', () => {
    const self: MappingEdge[] = [{ reviewerTeamId: 'a', targetTeamId: 'a' }];
    expect(detectAnomaly(80, self, ['a', 'b'])).toContain('self_mapping');
  });
});

describe('aggregatePeerScore', () => {
  it('四舍五入：49→2.5、100→5.0、60→3.0', () => {
    expect(aggregatePeerScore(49)).toBe(2.5);
    expect(aggregatePeerScore(100)).toBe(5.0);
    expect(aggregatePeerScore(60)).toBe(3.0);
  });

  it('0 → 0，且钳制在 0–5', () => {
    expect(aggregatePeerScore(0)).toBe(0);
    expect(aggregatePeerScore(120)).toBe(5);
  });
});
