import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { CompetitionController } from './competition.controller';
import { CompetitionService } from './competition.service';

@Module({
  imports: [AccessModule, AuditModule],
  controllers: [CompetitionController],
  providers: [CompetitionService],
  exports: [CompetitionService],
})
export class CompetitionModule {}
