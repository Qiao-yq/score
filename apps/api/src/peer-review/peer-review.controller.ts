import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types';
import { ResolvePeerReviewDto } from './dto/resolve-peer-review.dto';
import { SubmitPeerReviewDto } from './dto/submit-peer-review.dto';
import { PeerReviewService } from './peer-review.service';

@Controller('competitions/:competitionId/peer-review')
export class PeerReviewController {
  constructor(private readonly svc: PeerReviewService) {}

  @Roles('admin')
  @Post('generate-mapping')
  generateMapping(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.generateMapping(user, competitionId);
  }

  @Get('my-target')
  myTarget(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.getMyTarget(user, competitionId);
  }

  @Post('submit')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: SubmitPeerReviewDto,
  ) {
    return this.svc.submit(user, competitionId, dto);
  }

  @Roles('admin')
  @Get('audit')
  audit(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.getAudit(user, competitionId);
  }

  @Roles('admin')
  @Post(':reviewId/resolve')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: ResolvePeerReviewDto,
  ) {
    return this.svc.resolve(user, competitionId, reviewId, dto);
  }
}
