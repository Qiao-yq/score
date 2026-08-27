import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types';

/** 从请求中取当前登录用户（由 JwtAuthGuard 注入） */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
