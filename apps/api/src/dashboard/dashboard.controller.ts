import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types';
import { DashboardService } from './dashboard.service';

@Controller('competitions/:competitionId/dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('ranking')
  ranking(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.ranking(user, competitionId);
  }

  @Get('radar')
  radar(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.radar(user, competitionId);
  }

  @Get('progress')
  progress(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.progress(user, competitionId);
  }

  @Get('wordcloud')
  wordcloud(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.wordcloud(user, competitionId);
  }

  @Get('ticker')
  ticker(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.ticker(user, competitionId);
  }

  @Get('sankey')
  @Roles('admin')
  sankey(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.sankey(user, competitionId);
  }
}
