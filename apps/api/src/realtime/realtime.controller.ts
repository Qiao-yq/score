import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RealtimeService } from './realtime.service';

/** 实时链路监控指标（M1-02 §8：连接数/消息数/重试/失败） */
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Roles('admin')
  @Get('metrics')
  metrics() {
    return this.realtime.metricsSnapshot();
  }
}
