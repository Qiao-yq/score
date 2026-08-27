/** 环境配置。开发期默认指向本机 NestJS（HTTP 3000 + socket.io /ws）。 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
export const WS_NAMESPACE = '/ws';
