import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { GlobalRole } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

const GLOBAL_ROLES: readonly string[] = ['admin', 'teacher', 'audience'] as const;

/**
 * 用户目录（仅公开字段，供「分配教师 / 添加成员」选择器使用）。
 * 不返回 passwordHash；写入接口（assignTeacher/addMember）仍由各自服务端鉴权。
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string, role?: string) {
    const where: Prisma.UserWhereInput = {};
    if (role && GLOBAL_ROLES.includes(role)) {
      where.globalRole = role as GlobalRole;
    }
    const needle = q?.trim();
    if (needle) {
      where.OR = [
        { email: { contains: needle, mode: 'insensitive' } },
        { name: { contains: needle, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, globalRole: true },
    });
  }
}
