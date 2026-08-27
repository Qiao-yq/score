import { IsBoolean, IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateCompetitionDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsDateString()
  submitDeadline!: string;

  @IsOptional()
  @IsString()
  rubricVersion?: string;

  @IsOptional()
  @IsBoolean()
  peerReviewEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardPublished?: boolean;
}
