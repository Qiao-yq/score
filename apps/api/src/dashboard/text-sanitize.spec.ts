import { describe, expect, it } from 'vitest';
import { sanitizePii, tokenize, truncate } from './text-sanitize';

describe('sanitizePii', () => {
  it('替换邮箱', () => {
    expect(sanitizePii('联系 admin@task.dev 获取')).toBe('联系 [已隐藏] 获取');
  });

  it('替换手机号', () => {
    expect(sanitizePii('电话 13812345678 请查收')).toBe('电话 [已隐藏] 请查收');
  });

  it('替换 6–12 位学号', () => {
    expect(sanitizePii('学号 2023123456 同学')).toBe('学号 [已隐藏] 同学');
  });

  it('不误伤普通短数字与长数字', () => {
    expect(sanitizePii('得分 95 分')).toBe('得分 95 分');
    expect(sanitizePii('编号 1234567890123')).toBe('编号 1234567890123');
  });

  it('无敏感信息原样返回', () => {
    expect(sanitizePii('交互视觉风格统一')).toBe('交互视觉风格统一');
  });

  it('手机号紧邻数字不误判（负向断言，>12 位避开学号规则）', () => {
    expect(sanitizePii('订单号 9913812345678')).toBe('订单号 9913812345678');
  });
});

describe('truncate', () => {
  it('不超长原样返回', () => {
    expect(truncate('短评语', 80)).toBe('短评语');
  });

  it('超长截断并加省略号（按码点）', () => {
    expect(truncate('一二三四五六七八九十', 5)).toBe('一二三四五…');
  });

  it('emoji 按码点截断不撕裂代理对', () => {
    expect(truncate('a😀b😀c', 4)).toBe('a😀b😀…');
  });
});

describe('tokenize', () => {
  it('提取 ASCII 词（小写）', () => {
    expect(tokenize('使用 React 与 NestJS')).toContain('react');
    expect(tokenize('使用 React 与 NestJS')).toContain('nestjs');
  });

  it('过滤停用词二元组', () => {
    const tokens = tokenize('这个项目的设计');
    expect(tokens).not.toContain('这个');
    expect(tokens).not.toContain('项目');
    expect(tokens).not.toContain('设计');
  });

  it('保留非停用词二元组', () => {
    expect(tokenize('交互视觉风格统一')).toContain('视觉');
  });

  it('空文本返回空数组', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('停用词独占字符时过滤', () => {
    expect(tokenize('的的的')).toEqual([]);
  });
});
