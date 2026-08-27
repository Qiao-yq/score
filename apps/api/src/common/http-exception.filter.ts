import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { ApiErrorBody } from './errors';

/**
 * 统一异常过滤：把 Nest 内置异常（如 ValidationPipe 的 400）也归一化为
 * `{ code, message, details, traceId }`，未识别错误归为 INTERNAL。
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const traceId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ApiErrorBody = { code: 'INTERNAL', message: '服务端错误', traceId };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        body = { code: 'INTERNAL', message: res, traceId };
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        const rawMessage = r.message;
        const msg = Array.isArray(rawMessage)
          ? rawMessage.length > 0
            ? rawMessage.join('；')
            : '请求参数不合法'
          : String(rawMessage ?? '请求失败');
        body = {
          code: (r.code as string) ?? mapStatusToCode(status),
          message: msg,
          details: (r.details as unknown) ?? undefined,
          traceId,
        };
      }
    }

    response.status(status).json(body);
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTH_REQUIRED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'VERSION_CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL';
  }
}
