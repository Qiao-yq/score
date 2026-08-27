import { HttpException, HttpStatus } from '@nestjs/common';

/** 统一错误响应体（与 M1-02 §3 错误码对齐） */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  traceId?: string;
}

/**
 * 抛出结构化业务错误。
 * @param status HTTP 状态码
 * @param code 业务错误码（见 @task/contracts ERROR_CODE）
 */
export function apiError(
  status: HttpStatus,
  code: string,
  message: string,
  details?: unknown,
): never {
  const body: ApiErrorBody = { code, message };
  if (details !== undefined) body.details = details;
  throw new HttpException(body, status);
}

/** 便捷：未找到（对当前角色不可见，不泄露存在性） */
export function notFound(message = '资源不存在'): never {
  return apiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
}

/** 便捷：无权限 */
export function forbidden(message = '无权限执行该操作'): never {
  return apiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
}

/** 便捷：参数校验失败 */
export function validationError(message: string, details?: unknown): never {
  return apiError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', message, details);
}
