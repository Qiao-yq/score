import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  projectName?: string;

  @IsOptional()
  @IsString()
  projectDescription?: string;

  @IsOptional()
  @IsString()
  reportUrl?: string;

  @IsOptional()
  @IsString()
  prototypeUrl?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;
}
