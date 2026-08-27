/**
 * 展示层常量与格式化工具。
 * 维度 key 是稳定标识（contracts DimensionKey）；这里只放「中文标签」等展示信息，
 * 权重/阈值仍由后端 rubrics 表数据驱动，前端不参与评分计算。
 */

/** 前六维 + 互评的中文标签 */
export const DIMENSION_LABELS: Record<string, string> = {
  submit_speed: '提交速度',
  report_quality: '报告质量',
  interaction_visual: '交互视觉',
  function_experience: '功能体验',
  tech_performance: '技术性能',
  presentation: '演示效果',
  peer_review: '团队互评',
};

/** Agent 实际出分的 5 个维度（submit_speed 系统注入、peer_review 互评，均不在此） */
export const AGENT_DIMENSIONS: ReadonlyArray<{
  key: string;
  label: string;
  weight: number;
  subs: string[];
}> = [
  {
    key: 'report_quality',
    label: '报告质量',
    weight: 30,
    subs: ['completeness', 'structure', 'writing', 'depth'],
  },
  {
    key: 'interaction_visual',
    label: '交互视觉',
    weight: 20,
    subs: ['visual_design', 'interaction_fluency', 'accessibility'],
  },
  {
    key: 'function_experience',
    label: '功能体验',
    weight: 15,
    subs: ['feature_completeness', 'usability', 'stability'],
  },
  {
    key: 'tech_performance',
    label: '技术性能',
    weight: 10,
    subs: ['performance', 'security', 'code_quality'],
  },
  {
    key: 'presentation',
    label: '演示效果',
    weight: 10,
    subs: ['clarity', 'structure', 'delivery'],
  },
];

export const RISK_FLAG_LABELS: Record<string, string> = {
  low_confidence: '低置信度',
  agent_teacher_diff: '差异>20',
  teacher_modified_over_ratio: '改幅>20%',
  unresolved_evidence: '证据缺失',
};

export const TEACHER_ACTION_LABELS: Record<string, string> = {
  approve: '认可 Agent',
  suggest_modify: '建议修改',
  insufficient: '资料不足',
};

export const VISIBILITY_LABELS: Record<string, string> = {
  captain: '仅队长',
  all: '全员',
  dashboard: '公示',
};

export const COMMENT_SOURCE_LABELS: Record<string, string> = {
  agent: 'Agent',
  teacher: '教师',
  manual_fallback: '人工补录',
};

export const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  report: '报告',
  prototype: '原型',
  video: '视频',
  image: '图片',
  other: '其他',
};

export const GLOBAL_ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  teacher: '教师',
  audience: '观众',
};

/** 评分原始分 0–100 整数 → 展示（无则 —） */
export function fmtScore(n: number | null | undefined): string {
  return n == null ? '—' : String(n);
}

/** 最终分/合成分 → 1 位小数 */
export function fmtDecimal(n: number | null | undefined): string {
  return n == null ? '—' : n.toFixed(1);
}

/** 置信度 0–1 → 百分比 */
export function fmtConfidence(n: number | null | undefined): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

/** ISO 时间 → 本地可读 */
export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', { hour12: false });
}

/** datetime-local 输入值 → ISO 字符串（给 @IsDateString 的 submitDeadline 用） */
export function localInputToIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

/** 文件大小字节 → 人类可读 */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
