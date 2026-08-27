import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types';
import { ReviewScoreDto } from './dto/review-score.dto';
import { SaveAgentScoreDto } from './dto/save-agent-score.dto';
import { ScoringService } from './scoring.service';

@Controller('teams/:teamId')
export class ScoringController {
  constructor(private readonly svc: ScoringService) {}

  @Roles('admin', 'teacher')
  @Post('score')
  trigger(@CurrentUser() user: AuthUser, @Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.svc.trigger(user, teamId);
  }

  @Roles('admin', 'teacher')
  @Get('score/status')
  status(@CurrentUser() user: AuthUser, @Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.svc.scoreStatus(user, teamId);
  }

  // Agent 结果摄入：生产环境由评分 worker 调用，M3 阶段 admin/教师直接调用以跑通闭环
  @Roles('admin', 'teacher')
  @Post('score/agent-result')
  saveAgentScore(
    @CurrentUser() user: AuthUser,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: SaveAgentScoreDto,
  ) {
    return this.svc.saveAgentScore(user, teamId, dto);
  }

  @Get('scores')
  list(@CurrentUser() user: AuthUser, @Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.svc.listScores(user, teamId);
  }

  @Get('scores/:version')
  get(
    @CurrentUser() user: AuthUser,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('version') version: string,
  ) {
    return this.svc.getScore(user, teamId, version);
  }

  @Roles('admin', 'teacher')
  @Post('scores/:version/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('version') version: string,
    @Body() dto: ReviewScoreDto,
  ) {
    return this.svc.review(user, teamId, version, dto);
  }

  @Roles('admin')
  @Post('scores/:version/approve')
  approve(
    @CurrentUser() user: AuthUser,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('version') version: string,
  ) {
    return this.svc.approve(user, teamId, version);
  }

  @Roles('admin', 'teacher')
  @Get('evidence')
  evidence(@CurrentUser() user: AuthUser, @Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.svc.listEvidence(user, teamId);
  }
}
