import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class AddMemberDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsIn(['captain', 'member'])
  role?: 'captain' | 'member';
}
