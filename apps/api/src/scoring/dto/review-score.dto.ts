import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DimensionReviewDto {
  @IsString()
  dimensionKey!: string;

  @IsIn(['approve', 'suggest_modify', 'insufficient'])
  action!: 'approve' | 'suggest_modify' | 'insufficient';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewScoreDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionReviewDto)
  dimensionReviews!: DimensionReviewDto[];
}
