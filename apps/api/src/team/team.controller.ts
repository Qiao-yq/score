import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { RegisterAttachmentDto } from './dto/register-attachment.dto';
import { UnlockDto } from './dto/unlock.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamService } from './team.service';

@Controller()
export class TeamController {
  constructor(private readonly svc: TeamService) {}

  @Post('competitions/:competitionId/teams')
  create(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.svc.create(user, competitionId, dto);
  }

  @Get('competitions/:competitionId/teams')
  list(
    @CurrentUser() user: AuthUser,
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
  ) {
    return this.svc.list(user, competitionId);
  }

  @Get('teams/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(user, id);
  }

  @Patch('teams/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Post('teams/:id/members')
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.svc.addMember(user, id, dto);
  }

  @Post('teams/:id/attachments')
  registerAttachment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterAttachmentDto,
  ) {
    return this.svc.registerAttachment(user, id, dto);
  }

  @Post('teams/:id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.submit(user, id);
  }

  @Roles('admin')
  @Post('teams/:id/unlock')
  unlock(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UnlockDto,
  ) {
    return this.svc.unlock(user, id, dto.reason);
  }
}
