import { Global, Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { RealtimeController } from './realtime.controller';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

/**
 * 实时事件模块（@Global 导出 RealtimeService，供 scoring/team/peer-review 广播）。
 * 网关依赖：JwtService（AuthModule 全局）、AccessService（此处导入）、PrismaService（全局）。
 */
@Global()
@Module({
  imports: [AccessModule],
  controllers: [RealtimeController],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
