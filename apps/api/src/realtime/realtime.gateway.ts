import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { EVENT } from '@task/contracts';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService, type RoleContext } from './realtime.service';

interface SubscribePayload {
  competitionId: string;
  /** 断线重连游标：仅回放 serverTime > after 的增量 */
  after?: string;
}

/**
 * WebSocket 网关（socket.io，命名空间 /ws）。
 * 鉴权：握手 ?token= 或 auth.token；订阅按角色 scope 过滤，未授权无法订阅未发布数据。
 */
@WebSocketGateway({ namespace: '/ws', cors: { origin: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly access: AccessService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(): void {
    this.realtime.attachServer(this.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    const user = this.verify(token);
    if (!user) {
      this.logger.warn('WS 拒绝连接：token 无效');
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    this.realtime.registerConnection();
  }

  handleDisconnect(client: Socket): void {
    this.realtime.removeConnection(client.id);
  }

  @SubscribeMessage('subscribe')
  async onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubscribePayload,
  ): Promise<void> {
    const user = client.data.user as AuthUser | undefined;
    if (!user || !body?.competitionId) return;

    const ctx = await this.resolveContext(user, body.competitionId);
    if (!ctx) {
      client.emit(EVENT.CONNECTION_ACK, { clientMessageId: '', status: 'failed' });
      return;
    }

    this.realtime.subscribe(client.id, body.competitionId, ctx);

    // 断线重连：先回放增量，再继续实时流
    const after = body.after ? new Date(body.after) : undefined;
    const events = await this.realtime.replay(body.competitionId, after);
    for (const env of events) client.emit(env.event, env);
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribePayload): void {
    if (body?.competitionId) this.realtime.unsubscribe(client.id, body.competitionId);
  }

  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { serverTime: new Date().toISOString() });
  }

  // ── 内部 ─────────────────────────────────────────────────

  private verify(token?: string): AuthUser | null {
    if (!token) return null;
    try {
      return this.jwt.verify<AuthUser>(token);
    } catch {
      return null;
    }
  }

  /** 解析订阅上下文，并强制「未授权客户端无法订阅其他比赛或未发布数据」 */
  private async resolveContext(user: AuthUser, competitionId: string): Promise<RoleContext | null> {
    const role = await this.access.resolve(user, competitionId);
    if (role.isAdmin || role.isTeacher) {
      return { isAdmin: role.isAdmin, isTeacher: role.isTeacher, teamId: role.teamId };
    }
    if (role.teamId) {
      return { isAdmin: false, isTeacher: false, teamId: role.teamId };
    }
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { dashboardPublished: true },
    });
    if (competition?.dashboardPublished) {
      return { isAdmin: false, isTeacher: false, teamId: null };
    }
    return null;
  }
}
