import { IsInt, Max, Min } from 'class-validator';

/** 队长单次互评提交：0–100 整数综合分（M1-05 §1） */
export class SubmitPeerReviewDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;
}
