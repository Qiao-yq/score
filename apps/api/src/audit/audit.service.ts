import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
}

/** 审计日志写入（append-only，关键操作留痕，PRD §7） */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: AuditInput) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: input.before ? (input.before as object) : undefined,
        after: input.after ? (input.after as object) : undefined,
        reason: input.reason,
        ip: input.ip,
      },
    });
  }
}
