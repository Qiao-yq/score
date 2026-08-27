/** WebSocket 事件名（与 M1-02 §5.2 一致，前后端共用，避免手写不一致） */
export const EVENT = {
  SCORE_SUBMITTED: 'score.submitted',
  SCORE_APPROVED: 'score.approved',
  SCORE_NEEDS_REVIEW: 'score.needs_review',
  COMMENT_UPDATED: 'comment.updated',
  TEAM_SUBMITTED: 'team.submitted',
  PEER_REVIEW_SUBMITTED: 'peer_review.submitted',
  PEER_REVIEW_FLAGGED: 'peer_review.flagged',
  RANKING_UPDATED: 'ranking.updated',
  PROGRESS_UPDATED: 'progress.updated',
  DASHBOARD_PUBLISHED: 'dashboard.published',
  CONNECTION_ACK: 'connection.ack',
  SNAPSHOT: 'snapshot',
} as const;

export type WsEvent = (typeof EVENT)[keyof typeof EVENT];

/** 服务端 → 客户端消息信封（PRD §7.2） */
export interface WsEnvelope<T = unknown> {
  messageId: string;
  event: string;
  serverTime: string;
  competitionId: string;
  entityId: string;
  entityVersion: number;
  actorId?: string;
  payload: T;
}

/** 客户端 → 服务端消息信封（携带 clientMessageId 幂等） */
export interface ClientEnvelope<T = unknown> {
  clientMessageId: string;
  event: string;
  competitionId: string;
  payload: T;
}

/** 连接确认 */
export interface AckPayload {
  clientMessageId: string;
  status: 'acked' | 'failed';
}
