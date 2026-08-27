import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  /** 用户目录：登录即可读（全局 JwtAuthGuard 已拦截未登录）。 */
  @Get()
  list(@Query('q') q?: string, @Query('role') role?: string) {
    return this.svc.list(q, role);
  }
}
