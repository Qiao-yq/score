import { IsBoolean } from 'class-validator';

export class PublishDashboardDto {
  @IsBoolean()
  published!: boolean;
}
