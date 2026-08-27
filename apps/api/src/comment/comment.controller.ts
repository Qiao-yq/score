import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentVisibilityDto } from './dto/update-comment-visibility.dto';

@Controller()
export class CommentController {
  constructor(private readonly svc: CommentService) {}

  @Get('teams/:teamId/comments')
  list(@CurrentUser() user: AuthUser, @Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.svc.list(user, teamId);
  }

  @Post('teams/:teamId/comments')
  create(
    @CurrentUser() user: AuthUser,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.svc.create(user, teamId, dto);
  }

  @Patch('comments/:commentId/visibility')
  updateVisibility(
    @CurrentUser() user: AuthUser,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentVisibilityDto,
  ) {
    return this.svc.updateVisibility(user, commentId, dto);
  }
}
