import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
};

/**
 * Normalises every thrown HttpException — Nest's built-ins (validation
 * pipe, guards, NotFoundException, …) and our own DomainException — into
 * the `{ error: { code, message } }` envelope from BACKEND-README.md §9.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    let code: string;
    let message: string;

    if (typeof body === 'object' && body !== null && 'code' in body) {
      code = String((body as Record<string, unknown>).code);
      message = String((body as Record<string, unknown>).message ?? exception.message);
    } else if (typeof body === 'object' && body !== null && 'message' in body) {
      const raw = (body as Record<string, unknown>).message;
      message = Array.isArray(raw) ? raw.join('; ') : String(raw);
      code = STATUS_CODES[status] ?? 'ERROR';
    } else {
      message = exception.message;
      code = STATUS_CODES[status] ?? 'ERROR';
    }

    response.status(status || HttpStatus.INTERNAL_SERVER_ERROR).json({ error: { code, message } });
  }
}
