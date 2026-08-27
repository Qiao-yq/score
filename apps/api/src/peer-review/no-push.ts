/**
 * NO Push 互评核心纯函数（无 DB / 无副作用，可独立单测）。
 * 依据 M1-05：随机一对一映射（拒绝采样 derangement）+ 双盲 + 异常检测 + 匿名聚合。
 *
 * 映射目标：生成「无自评的随机双射（derangement）」。双射天然满足
 * 「每队评 1、被评 1、关系不重复、全覆盖」；无不动点满足「禁自评」。
 * 决策（2026-08-27）：采用拒绝采样，允许成对互评（2-cycle），仅禁自评。
 */

/** 一条映射边：reviewer 评价 target */
export interface MappingEdge {
  reviewerTeamId: string;
  targetTeamId: string;
}

/** Fisher-Yates 洗牌（rng 返回 [0,1)） */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 生成无自评的随机排列（derangement）。items 长度 <2 时返回空。 */
export function generateDerangement<T>(items: T[], rng: () => number): T[] {
  if (items.length < 2) return [];
  // 期望约 e≈2.72 次循环命中；items 恒有 derangement（含奇数 n）
  for (;;) {
    const perm = shuffle(items, rng);
    if (perm.every((v, i) => v !== items[i])) return perm;
  }
}

/**
 * 构建一对一映射（拒绝采样 derangement）。
 * @param teamIds 参与互评的团队 id（≥2）
 * @returns 映射边数组；teamIds.length < 2 时返回 null（关闭互评，管理员补录）
 */
export function buildMapping(teamIds: string[], rng: () => number): MappingEdge[] | null {
  if (teamIds.length < 2) return null;
  const perm = generateDerangement(teamIds, rng);
  return teamIds.map((reviewer, i) => ({ reviewerTeamId: reviewer, targetTeamId: perm[i] }));
}

/** 校验映射为「无自评的双射 + 全覆盖」，返回异常原因（空 = 合法）。 */
export function validateBijection(mapping: MappingEdge[], teamIds: string[]): string[] {
  const reasons: string[] = [];
  const teamSet = new Set(teamIds);
  const targets = new Set<string>();
  const reviewers = new Set<string>();

  for (const edge of mapping) {
    if (edge.reviewerTeamId === edge.targetTeamId) reasons.push('self_mapping');
    if (targets.has(edge.targetTeamId)) reasons.push('duplicate_target');
    targets.add(edge.targetTeamId);
    reviewers.add(edge.reviewerTeamId);
  }

  for (const id of teamSet) {
    if (!targets.has(id) || !reviewers.has(id)) {
      reasons.push('uncovered_team');
      break;
    }
  }
  // 去重（多边可能命中同一类）
  return [...new Set(reasons)];
}

/**
 * 提交时异常检测（M1-05 §4）。本版实现可服务端判定的结构化检测；
 * account_link / device_network_link 等身份/设备信号依赖外部数据，M4 暂不实现，
 * 由管理员 resolve 时以 admin_conflict 口径人工标记。
 */
export function detectAnomaly(score: number, mapping: MappingEdge[], teamIds: string[]): string[] {
  const reasons: string[] = [];
  if (!Number.isInteger(score) || score < 0 || score > 100) reasons.push('score_out_of_range');
  reasons.push(...validateBijection(mapping, teamIds));
  return [...new Set(reasons)];
}

/** 四舍五入到 1 位小数 */
export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** 区间钳制 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * 互评聚合（M1-05 §5）：有效互评得分 = 收到有效队长评分 / 100 × 5，
 * 限制 0–5、四舍五入到 1 位。未收到有效评分 → 0。
 */
export function aggregatePeerScore(rawScore: number): number {
  return clamp(round1((rawScore / 100) * 5), 0, 5);
}
