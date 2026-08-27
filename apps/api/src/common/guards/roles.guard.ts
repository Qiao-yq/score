import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser, GlobalRole } from '../types';

/** 全局角色守卫：校验 @Roles() 声明的角色 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<GlobalRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, AuthUser>).user;
    if (!user) return false;

    if (roles.includes(user.globalRole)) return true;

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: '角色无权限执行该操作',
    });
  }
}
