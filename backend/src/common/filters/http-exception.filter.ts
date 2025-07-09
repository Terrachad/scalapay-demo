import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly debugEnabled = process.env.NODE_ENV === 'development';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract additional context
    const requestId = (request as any).requestId || 'unknown';
    const user = (request as any).user;
    const userInfo = user ? `${user.email} (${user.id})` : 'Anonymous';
    const ip = request.ip || request.connection.remoteAddress || 'Unknown';
    const userAgent = request.get('User-Agent') || 'Unknown';

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    // Determine error type and extract details
    let errorType = 'UNKNOWN_ERROR';
    let errorDetails: any = {};

    if (exception instanceof HttpException) {
      errorType = 'HTTP_EXCEPTION';
      errorDetails = {
        name: exception.name,
        message: exception.message,
        cause: exception.cause,
      };
    } else if (exception instanceof Error) {
      errorType = 'RUNTIME_ERROR';
      errorDetails = {
        name: exception.name,
        message: exception.message,
        stack: this.debugEnabled ? exception.stack : undefined,
      };
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message,
      error: typeof message === 'object' ? (message as any).error : undefined,
      requestId,
      ...(this.debugEnabled && {
        debug: {
          errorType,
          userAgent,
          ip,
          user: userInfo,
          headers: this.sanitizeHeaders(request.headers),
          body: this.sanitizeBody(request.body),
        },
      }),
    };

    // Enhanced error logging
    this.logger.error('💥 ═══════════════════════════════════════════════════════════════════════');
    this.logger.error(`💥 🚨 HTTP EXCEPTION CAUGHT [${requestId}] 🚨`);
    this.logger.error(`💥 Request: ${request.method} ${request.url}`);
    this.logger.error(`💥 Status: ${status} (${HttpStatus[status] || 'Unknown'})`);
    this.logger.error(`💥 User: ${userInfo}`);
    this.logger.error(`💥 IP: ${ip}`);
    this.logger.error(`💥 User-Agent: ${userAgent}`);
    this.logger.error(`💥 Error Type: ${errorType}`);
    this.logger.error(`💥 Error Message: ${errorDetails.message || 'Unknown error'}`);

    if (this.debugEnabled) {
      this.logger.error(`💥 Error Details: ${JSON.stringify(errorDetails, null, 2)}`);

      if (request.body && Object.keys(request.body).length > 0) {
        this.logger.error(
          `💥 Request Body: ${JSON.stringify(this.sanitizeBody(request.body), null, 2)}`,
        );
      }

      if (errorDetails.stack) {
        this.logger.error(`💥 Stack Trace:\n${errorDetails.stack}`);
      }
    }

    // Log severity based on status code
    if (status >= 500) {
      this.logger.error('💥 🔥 CRITICAL SERVER ERROR - Requires immediate attention!');
    } else if (status === 401 || status === 403) {
      this.logger.warn('💥 🔐 AUTHENTICATION/AUTHORIZATION ERROR');
    } else if (status >= 400) {
      this.logger.warn('💥 ⚠️  CLIENT ERROR');
    }

    this.logger.error('💥 ═══════════════════════════════════════════════════════════════════════');

    // Send response to client
    response.status(status).json(errorResponse);
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers
    if (sanitized.authorization) {
      sanitized.authorization = 'Bearer ***';
    }
    if (sanitized.cookie) {
      sanitized.cookie = '***';
    }

    // Keep only relevant headers for debugging
    const relevantHeaders = [
      'content-type',
      'content-length',
      'authorization',
      'x-forwarded-for',
      'x-real-ip',
      'referer',
      'origin',
    ];

    const filtered: any = {};
    relevantHeaders.forEach((header) => {
      if (sanitized[header]) {
        filtered[header] = sanitized[header];
      }
    });

    return filtered;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'confirmPassword', 'token', 'refreshToken', 'secret'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }
}
