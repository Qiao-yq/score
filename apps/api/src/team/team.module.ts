import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [AccessModule, AuditModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
