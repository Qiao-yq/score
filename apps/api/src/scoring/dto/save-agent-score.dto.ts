import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Agent 对单个维度的结构化输出 */
export class AgentDimensionDto {
  @IsString()
  dimensionKey!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  agentScore!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  agentConfidence!: number;

  @IsArray()
  @IsString({ each: true })
  evidenceIds!: string[];

  @IsString()
  highlight!: string;

  @IsString()
  suggestion!: string;

  @IsOptional()
  @IsObject()
  subScores?: Record<string, number>;
}

/** Agent 评分结果摄入（由评分 worker 调用，M0.5 后接入真实 Agent） */
export class SaveAgentScoreDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentDimensionDto)
  dimensions!: AgentDimensionDto[];

  @IsOptional()
  @IsString()
  modelVersion?: string;

  @IsOptional()
  @IsString()
  promptVersion?: string;
}
