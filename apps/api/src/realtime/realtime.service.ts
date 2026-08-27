import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import type { WsEnvelope, WsScope } from '@task/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { scopeAllows, type ScopeContext } from './scope';

/** 订阅者在某比赛内的有效角色（用于广播 scope 过滤） */
export type RoleContext = ScopeContext;

export interface PublishInput {
  event: string;
  competitionId: string;
  entityId?: string;
  entityVersion?: number;
  actorId?: string;
  payload: Record<string, unknown>;
  scope: WsScope;
  /** scope=team 时，限定可接收的团队 id */
  teamId?: string;
}

/**
 * 实时事件服务：出箱落库（幂等/回放）+ 内存广播 + 监控指标。
 * PRD §12 应急：outbox 写失败不阻断业务主流程（评分写库优先，广播尽力而为）。
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;
  private subscriptions = new Map<string, Map<string, RoleContext>>();
  private metrics = { connections: 0, messages: 0, acks: 0, retries: 0, failures: 0 };

  constructor(private readonly prisma: PrismaService) {}

  /** 由网关在 afterInit 注入 socket.io Server 引用 */
  attachServer(server: Server): void {
    this.server = server;
  }

  registerConnection(): void {
    this.metrics.connections++;
  }

  removeConnection(socketId: string): void {
    this.subscriptions.delete(socketId);
  }

  subscribe(socketId: string, competitionId: string, role: RoleContext): void {
    let comps = this.subscriptions.get(socketId);
    if (!comps) {
      comps = new Map();
      this.subscriptions.set(socketId, comps);
    }
    comps.set(competitionId, role);
  }

  unsubscribe(socketId: string, competitionId: string): void {
    this.subscriptions.get(socketId)?.delete(competitionId);
  }

  /** 发布事件：写 outbox（可回放）后向订阅者广播，返回信封 */
  async publish(input: PublishInput): Promise<WsEnvelope> {
    const messageId = randomUUID();
    const serverTime = new Date();
    this.metrics.messages++;

    try {
      await this.prisma.eventOutbox.create({
        data: {
          messageId,
          competitionId: input.competitionId,
          event: input.event,
          entityId: input.entityId ?? null,
          entityVersion: input.entityVersion ?? null,
          actorId: input.actorId ?? null,
          payload: input.payload as Prisma.InputJsonValue,
          serverTime,
        },
      });
    } catch {
      this.metrics.failures++;
      // 出箱写失败仍尽力广播（不影响主流程评分写入）
    }

    const envelope: WsEnvelope = {
      messageId,
      event: input.event,
      serverTime: serverTime.toISOString(),
      competitionId: input.competitionId,
      entityId: input.entityId ?? '',
      entityVersion: input.entityVersion ?? 1,
      actorId: input.actorId,
      payload: input.payload,
    };
    this.broadcast(envelope, input.scope, input.teamId);
    return envelope;
  }

  /** 增量回放（断线重连拉取，按 serverTime 游标） */
  async replay(competitionId: string, after?: Date): Promise<WsEnvelope[]> {
    const rows = await this.prisma.eventOutbox.findMany({
      where: { competitionId, ...(after ? { serverTime: { gt: after } } : {}) },
      orderBy: { serverTime: 'asc' },
    });
    return rows.map((r) => ({
      messageId: r.messageId,
      event: r.event,
      serverTime: r.serverTime.toISOString(),
      competitionId: r.competitionId,
      entityId: r.entityId ?? '',
      entityVersion: r.entityVersion ?? 1,
      actorId: r.actorId ?? undefined,
      payload: r.payload as Record<string, unknown>,
    }));
  }

  metricsSnapshot() {
    return { ...this.metrics };
  }

  // ── 广播 ─────────────────────────────────────────────────

  private broadcast(envelope: WsEnvelope, scope: WsScope, teamId?: string): void {
    if (!this.server) return;
    for (const [socketId, comps] of this.subscriptions) {
      const ctx = comps.get(envelope.competitionId);
      if (!ctx) continue;
      if (scopeAllows(ctx, scope, teamId)) {
        this.server.to(socketId).emit(envelope.event, envelope);
      }
    }
  }
}
