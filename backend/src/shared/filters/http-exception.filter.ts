import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

const STATUS_SLUG_MAP: Record<number, { type: string; title: string }> = {
  400: { type: 'bad-request', title: 'Bad Request' },
  401: { type: 'unauthorized', title: 'Unauthorized' },
  403: { type: 'forbidden', title: 'Forbidden' },
  404: { type: 'not-found', title: 'Not Found' },
  409: { type: 'conflict', title: 'Conflict' },
  429: { type: 'too-many-requests', title: 'Too Many Requests' },
  500: { type: 'internal-server-error', title: 'Internal Server Error' },
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let detail = 'Đã xảy ra lỗi hệ thống.';
    let validationErrors: unknown;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const respObj = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(respObj.message)) {
          detail = respObj.message.join('; ');
          validationErrors = respObj.message;
        } else if (typeof respObj.message === 'string') {
          detail = respObj.message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
    }

    const meta = STATUS_SLUG_MAP[status] || {
      type: `http-${status}`,
      title: HttpStatus[status] || 'Error',
    };

    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: `https://api.cjfoods.vn/errors/${meta.type}`,
        title: meta.title,
        status,
        detail,
        message: detail, // Preserved for existing frontend error handlers
        instance: request.originalUrl || request.url,
        timestamp: new Date().toISOString(),
        ...(validationErrors ? { errors: validationErrors } : {}),
      });
  }
}
