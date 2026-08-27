/**
 * 前端展示类型（对应后端实际返回的序列化形状）。
 * contracts 里已有的 score/peer-review/dashboard 类型优先复用，
 * 这里只补 contracts 未覆盖的「比赛/团队/评语/评分明细序列化」形状。
 */

export type TeamRole = 'captain' | 'member';
export type GlobalRole = 'admin' | 'teacher' | 'audience';
export type CompetitionStatus = 'draft' | 'active' | 'closed';
export type TeamStatus = 'draft' | 'submitted' | 'locked' | 'published';

/** GET /users 的用户目录项（仅公开字段） */
export interface UserPublic {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
}

export interface CompetitionRole {
  isAdmin: boolean;
  isTeacher: boolean;
  teamId: string | null;
  teamRole: TeamRole | null;
}

export interface Competition {
  id: string;
  name: string;
  timezone: string;
  submitDeadline: string;
  rubricVersion: string;
  peerReviewEnabled: boolean;
  dashboardPublished: boolean;
  status: CompetitionStatus;
  createdBy: string | null;
  createdAt: string;
}

/** GET /competitions/:id 的返回：比赛 + 当前用户在此比赛内的角色 */
export interface CompetitionWithRole extends Competition {
  myRole: CompetitionRole;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  user: { id: string; name: string; email?: string };
}

export interface Attachment {
  id: string;
  teamId: string;
  type: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  accessStatus: string;
  uploadedAt: string;
  createdBy: string | null;
}

export interface Team {
  id: string;
  competitionId: string;
  name: string;
  projectName: string;
  projectDescription: string | null;
  reportUrl: string | null;
  prototypeUrl: string | null;
  videoUrl: string | null;
  status: TeamStatus;
  submittedAt: string | null;
  createdAt: string;
  members?: TeamMember[];
  attachments?: Attachment[];
  competition?: { id: string; name: string; submitDeadline: string };
}

/** GET /teams/:id/scores 与 /scores/:version 的序列化维度明细 */
export interface ScoreDimensionDetail {
  dimensionKey: string;
  agentScore: number | null;
  agentConfidence: number | null;
  agentEvidence: string[];
  subScores: Record<string, number> | null;
  highlight: string | null;
  suggestion: string | null;
  teacherScore: number | null;
  teacherAction: string | null;
  teacherReason: string | null;
  compositeScore: number | null;
}

/** 评分版本明细（后端 serializeScore 形状，注意字段是 agentEvidence 而非 evidenceIds） */
export interface ScoreDetail {
  id: string;
  teamId: string;
  scoreVersion: string;
  rubricVersion: string;
  inputVersion: string;
  finalScore: number | null;
  peerReviewScore: number | null;
  status: string;
  riskFlags: string[];
  modelVersion: string | null;
  promptVersion: string | null;
  generatedAt: string;
  approvedAt: string | null;
  dimensions: ScoreDimensionDetail[];
}

export interface Comment {
  id: string;
  teamId: string;
  dimensionKey: string;
  scoreVersion: string;
  highlight: string;
  suggestion: string;
  tags: string[];
  visibility: 'captain' | 'all' | 'dashboard';
  source: 'agent' | 'teacher' | 'manual_fallback';
  createdBy: string | null;
  createdAt: string;
}

export interface PeerMappingEdge {
  reviewerTeamId: string;
  targetTeamId: string;
}

export interface PeerMapping {
  mappingId: string;
  algorithmVersion: string;
  status: string;
  edges: PeerMappingEdge[];
}

export interface PeerReviewRecord {
  id: string;
  mappingId: string;
  reviewerTeamId: string;
  targetTeamId: string;
  score: number | null;
  status: string;
  anomalyReasons: string[];
  submittedAt: string;
}

/** GET /competitions/:id/peer-review/audit 的返回 */
export interface PeerAudit {
  mappings: PeerMapping[];
  reviews: PeerReviewRecord[];
}
