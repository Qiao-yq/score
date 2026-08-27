import { IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';

export class RegisterAttachmentDto {
  @IsIn(['report', 'prototype', 'video', 'image', 'other'])
  type!: 'report' | 'prototype' | 'video' | 'image' | 'other';

  @IsString()
  @Length(1, 255)
  fileName!: string;

  @IsString()
  @Length(1, 100)
  mimeType!: string;

  @IsInt()
  @Min(0)
  @Max(209715200) // 200MB
  sizeBytes!: number;
}
