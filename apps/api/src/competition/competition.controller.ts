import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types';
import { CompetitionService } from './competition.service';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { PublishDashboardDto } from './dto/publish-dashboard.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';

@Controller('competitions')
export class CompetitionController {
  constructor(private readonly svc: CompetitionService) {}

  @Roles('admin')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCompetitionDto) {
    return this.svc.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(user, id);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompetitionDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Roles('admin')
  @Post(':id/teachers')
  assignTeacher(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.svc.assignTeacher(user, id, dto);
  }

  @Roles('admin')
  @Delete(':id/teachers/:userId')
  removeTeacher(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.svc.removeTeacher(user, id, userId);
  }

  @Roles('admin')
  @Post(':id/publish-dashboard')
  publishDashboard(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishDashboardDto,
  ) {
    return this.svc.setDashboardPublished(user, id, dto.published);
  }
}
