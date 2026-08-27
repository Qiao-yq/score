import { describe, expect, it } from 'vitest';
import { canViewComment, validateCommentLength } from './comments';

describe('validateCommentLength', () => {
  it('不足 minChars → false', () => {
    expect(validateCommentLength('好', 10)).toBe(false);
  });
  it('达到 minChars → true', () => {
    expect(validateCommentLength('报告结构清晰完整且层次分明', 10)).toBe(true);
  });
  it('只算非空白字符', () => {
    expect(validateCommentLength('      ', 10)).toBe(false);
  });
});

describe('canViewComment', () => {
  const captain = { role: 'captain' as const, isOwnTeam: true };
  const member = { role: 'member' as const, isOwnTeam: true };
  const otherCaptain = { role: 'captain' as const, isOwnTeam: false };
  const teacher = { role: 'teacher' as const, isOwnTeam: false };
  const admin = { role: 'admin' as const, isOwnTeam: false };
  const audience = { role: 'audience' as const, isOwnTeam: false };

  it('captain 可见性：队长本人/教师/管理员可见', () => {
    expect(canViewComment('captain', captain)).toBe(true);
    expect(canViewComment('captain', member)).toBe(false);
    expect(canViewComment('captain', otherCaptain)).toBe(false);
    expect(canViewComment('captain', teacher)).toBe(true);
    expect(canViewComment('captain', admin)).toBe(true);
    expect(canViewComment('captain', audience)).toBe(false);
  });

  it('all 可见性：全队 + 教师/管理员可见', () => {
    expect(canViewComment('all', member)).toBe(true);
    expect(canViewComment('all', otherCaptain)).toBe(false);
    expect(canViewComment('all', teacher)).toBe(true);
  });

  it('dashboard 可见性：所有人可见', () => {
    expect(canViewComment('dashboard', audience)).toBe(true);
    expect(canViewComment('dashboard', captain)).toBe(true);
  });
});
