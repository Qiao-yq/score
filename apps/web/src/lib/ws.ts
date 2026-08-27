import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { EVENT, type WsEnvelope } from '@task/contracts';
import { getToken } from './auth';
import { WS_NAMESPACE, WS_URL } from './env';

export type WsStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

/**
 * 实时订阅 hook：连接 /ws 命名空间，鉴权后 subscribe 指定比赛，
 * 按 socket.io 事件名分发。断线自动重连并重订阅（socket.id 变更后由服务端重新登记）。
 * 全量快照以 REST 轮询兜底，WS 仅用于实时增量触发刷新。
 */
export function useRealtime(
  competitionId: string | null,
  onEvent?: (env: WsEnvelope) => void,
): WsStatus {
  const [status, setStatus] = useState<WsStatus>('idle');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!competitionId) {
      setStatus('idle');
      return;
    }
    const token = getToken();
    if (!token) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const socket: Socket = io(`${WS_URL}${WS_NAMESPACE}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    const handleEvent = (env: WsEnvelope) => onEventRef.current?.(env);
    Object.values(EVENT).forEach((e) => socket.on(e, handleEvent));

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('subscribe', { competitionId });
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));

    return () => {
      socket.emit('unsubscribe', { competitionId });
      socket.disconnect();
    };
  }, [competitionId]);

  return status;
}
