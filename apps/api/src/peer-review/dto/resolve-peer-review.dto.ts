import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/** 管理员处理异常互评：作废/确认有效/重新分配（需 reason，PRD §6.2） */
export class ResolvePeerReviewDto {
  @IsIn(['valid', 'invalid', 'regenerate'])
  action!: 'valid' | 'invalid' | 'regenerate';

  @IsString()
  @MinLength(10)
  reason!: string;

  /** 重分配目标（可选，留空则由服务端重新随机） */
  @IsOptional()
  @IsString()
  reviewerTeamId?: string;
}
