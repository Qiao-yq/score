import { IsIn } from 'class-validator';

export class UpdateCommentVisibilityDto {
  @IsIn(['captain', 'all', 'dashboard'])
  visibility!: 'captain' | 'all' | 'dashboard';
}
