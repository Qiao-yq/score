/**
 * 大屏文本脱敏与分词（纯函数，无 DB / 无副作用，可独立单测）。
 * 依据 M1-06 §3：公示评语在服务端脱敏，前端不做二次放开。
 */

/** 词云停用词（基础版；正式分词留待引入中文分词库） */
export const STOPWORDS = new Set([
  '的',
  '了',
  '和',
  '是',
  '在',
  '与',
  '及',
  '等',
  '对',
  '并',
  '或',
  '中',
  '为',
  '有',
  '不',
  '也',
  '都',
  '而',
  '被',
  '从',
  '到',
  '其',
  '将',
  '之',
  '可以',
  '能够',
  '以及',
  '进行',
  '实现',
  '需要',
  '通过',
  '主要',
  '同时',
  '非常',
  '一些',
  '相关',
  '方面',
  '部分',
  '整体',
  '项目',
  '团队',
  '作品',
  '我们',
  '他们',
  '这个',
  '报告',
  '方案',
  '系统',
  '功能',
  '设计',
  '技术',
  '演示',
  '提交',
  '评分',
  '评语',
  '建议',
  '亮点',
  '一个',
]);

/** PII 脱敏（正则 + 常见敏感模式替换，PRD §8） */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?<!\d)1[3-9]\d{9}(?!\d)/g;
const STUDENT_ID_RE = /\b\d{6,12}\b/g;

/** 替换邮箱 / 手机号 / 学号（6–12 位纯数字）为 [已隐藏]。 */
export function sanitizePii(text: string): string {
  return text
    .replace(EMAIL_RE, '[已隐藏]')
    .replace(PHONE_RE, '[已隐藏]')
    .replace(STUDENT_ID_RE, '[已隐藏]');
}

/** 按 Unicode 码点截断，超出 max 追加省略号。 */
export function truncate(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max).join('')}…`;
}

/**
 * 简易中文分词：ASCII 词 + CJK 二元组 + 停用词过滤（基础版）。
 * 返回去停用词后的词元（小写），供词云统计频次。
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const m of text.matchAll(/[A-Za-z0-9_]{2,}/g)) tokens.push(m[0].toLowerCase());
  const cjk = text.replace(/[^一-龥]+/g, '');
  for (let i = 0; i + 1 < cjk.length; i++) {
    const a = cjk[i];
    const b = cjk[i + 1];
    if (!STOPWORDS.has(a) && !STOPWORDS.has(b)) tokens.push(a + b);
  }
  return tokens.filter((t) => !STOPWORDS.has(t));
}
