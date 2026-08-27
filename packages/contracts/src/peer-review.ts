/**
 * NO Push 互评类型（PRD §6 / M1-05）。
 * 互评单位为团队，每队仅队长提交 1 个 0–100 整数综合分，双盲 + 异常检测 + 匿名聚合。
 */

/** 单条互评状态（对应 peer_reviews.status） */
export type PeerReviewStatus = 'submitted' | 'suspicious' | 'valid' | 'invalid';

/** 互评映射生命周期（对应 peer_review_mappings.status） */
export type PeerReviewMappingStatus = 'active' | 'closed';

/** 映射算法版本（拒绝采样 derangement，见 M1-05 §2） */
export const PEER_MAPPING_ALGORITHM = 'derangement-v1';

/** 一条映射边：reviewer 评价 target */
export interface PeerMappingEntry {
  reviewerTeamId: string;
  targetTeamId: string;
}

/** 异常原因（M1-05 §4；本版实现结构化检测，身份/设备关联留待后续信号） */
export type PeerAnomalyReason =
  'score_out_of_range' | 'self_mapping' | 'duplicate_target' | 'uncovered_team';

/** 队长看到的匿名目标资料（双盲：不含队名/队长/评分来源身份） */
export interface AnonymousTarget {
  /** 匿名编号（不暴露真实队名/id） */
  targetRef: string;
  projectName: string;
  projectDescription: string | null;
  reportUrl: string | null;
  prototypeUrl: string | null;
  videoUrl: string | null;
  /** 队长本人是否已提交过互评 */
  alreadySubmitted: boolean;
}
