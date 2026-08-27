import { IsString, Length } from 'class-validator';

export class UnlockDto {
  @IsString()
  @Length(1, 500)
  reason!: string;
}
