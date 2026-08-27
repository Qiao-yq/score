import type { ScoreStatus, TeacherAction } from './dimensions';

/** 单个维度的评分明细（对应 score_dimensions 表） */
export interface DimensionScore {
  dimensionKey: string;
  /** Agent 原始分 0–100 */
  agentScore: number;
  /** Agent 置信度 0–1 */
  agentConfidence: number;
  /** 引用的证据 evidence_id（必须命中 evidence 表） */
  evidenceIds: string[];
  /** 亮点，≥10 字 */
  highlight: string;
  /** 改进建议，≥10 字 */
  suggestion: string;
  /** 教师分（未改时默认 = agentScore） */
  teacherScore?: number;
  teacherAction?: TeacherAction;
  teacherReason?: string;
  /** 合成分 = agent×0.7 + teacher×0.3 */
  compositeScore?: number;
}

/** 一次不可变评分版本（对应 scores 表） */
export interface ScoreVersion {
  scoreVersion: string;
  rubricVersion: string;
  inputVersion: string;
  dimensions: DimensionScore[];
  /** 提交速度系统注入分（Agent/教师不可改） */
  submitSpeedScore: number;
  finalScore?: number;
  /** NO Push 互评得分 0–5 */
  peerReviewScore?: number;
  riskFlags: string[];
  modelVersion?: string;
  promptVersion?: string;
  generatedAt: string;
  status: ScoreStatus;
}
