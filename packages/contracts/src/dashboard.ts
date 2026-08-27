/** 大屏（/dashboard）接口响应类型（M1-06）。仅下发已发布/脱敏数据。 */

/** 排名条目（最终分降序） */
export interface RankingItem {
  teamId: string;
  name: string;
  projectName: string;
  scoreVersion: string;
  finalScore: number;
  status: string;
  rank: number;
  /** 相对上一发布版本的排名升降（暂无快照时为 0） */
  delta: number;
}

/** 雷达图单维度平均值 */
export interface RadarDimension {
  key: string;
  label: string;
  avg: number;
}

export interface RadarResponse {
  dimensions: RadarDimension[];
  teamCount: number;
}

export interface ProgressResponse {
  /** 已提交团队数 */
  totalTeams: number;
  /** 已有评分版本（含未发布）的团队数 */
  scoredTeams: number;
  /** 已发布/已批准评分的团队数 */
  approvedTeams: number;
}

/** 词云条目（已脱敏、频次加权） */
export interface WordCloudItem {
  text: string;
  count: number;
}

/** 跑马灯条目（已脱敏、≤80 字） */
export interface TickerItem {
  id: string;
  text: string;
  dimensionKey: string;
}

/** 桑基图（仅管理员，匿名映射关系，不含分数/身份） */
export interface SankeyNode {
  id: string;
  label: string;
}

export interface SankeyLink {
  source: string;
  target: string;
}

export interface SankeyResponse {
  nodes: SankeyNode[];
  links: SankeyLink[];
}
