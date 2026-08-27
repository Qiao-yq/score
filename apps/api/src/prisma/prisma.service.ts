import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * 全局单例 Prisma 客户端（连接 PostgreSQL，Linux/Docker 环境运行时生效）。
 * 本地无 DB 时启动会失败，属预期（typecheck/build/单测不受影响）。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
