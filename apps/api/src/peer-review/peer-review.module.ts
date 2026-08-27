import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { PeerReviewController } from './peer-review.controller';
import { PeerReviewService } from './peer-review.service';

/**
 * NO Push 互评模块。
 * 依赖：AccessService（此处导入）、AuditService（此处导入）、
 * PrismaService（全局）、RealtimeService（RealtimeModule 全局）。
 */
@Module({
  imports: [AccessModule, AuditModule],
  controllers: [PeerReviewController],
  providers: [PeerReviewService],
  exports: [PeerReviewService],
})
export class PeerReviewModule {}
