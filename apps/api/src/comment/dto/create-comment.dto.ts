import { IsArray, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  dimensionKey!: string;

  @IsString()
  scoreVersion!: string;

  @IsString()
  @Length(1, 2000)
  highlight!: string;

  @IsString()
  @Length(1, 2000)
  suggestion!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['captain', 'all', 'dashboard'])
  visibility?: 'captain' | 'all' | 'dashboard';
}
