import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly debugEnabled = process.env.NODE_ENV === 'development';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const requestId = uuidv4();
    
    // Add request ID to request object for tracking
    (request as any).requestId = requestId;
    
    const { method, url, headers, body, ip } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const contentType = headers['content-type'] || 'Unknown';
    const authorization = headers['authorization'] ? 'Bearer ***' : 'None';
    const startTime = Date.now();

    // Extract user info if available (from previous auth processing)
    const user = (request as any).user;
    const userInfo = user ? `${user.email} (${user.id})` : 'Anonymous';

    // Log request start
    this.logger.log(`📨 ⬇️  INCOMING REQUEST [${requestId}] ═════════════════════════════════════`);
    this.logger.log(`📨 ${method} ${url}`);
    this.logger.log(`📨 User: ${userInfo}`);
    this.logger.log(`📨 IP: ${ip || 'Unknown'}`);
    this.logger.log(`📨 User-Agent: ${userAgent}`);
    this.logger.log(`📨 Content-Type: ${contentType}`);
    this.logger.log(`📨 Authorization: ${authorization}`);
    
    if (this.debugEnabled) {
      // Log additional headers in debug mode
      this.logger.debug(`📨 Headers: ${JSON.stringify(this.sanitizeHeaders(headers))}`);
      
      // Log request body for POST/PUT/PATCH (sanitized)
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        this.logger.debug(`📨 Body: ${JSON.stringify(this.sanitizeBody(body))}`);
      }
    }

    return next.handle().pipe(
      tap((responseData) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = response.statusCode;
        const responseSize = JSON.stringify(responseData || {}).length;

        // Log successful response
        this.logger.log(`📤 ⬆️  RESPONSE SUCCESS [${requestId}] ═══════════════════════════════════════`);
        this.logger.log(`📤 ${method} ${url} ${statusCode} - ${duration}ms`);
        this.logger.log(`📤 Response size: ${responseSize} bytes`);
        this.logger.log(`📤 User: ${userInfo}`);
        
        if (this.debugEnabled && responseData) {
          // Log response data in debug mode (truncated if too large)
          const responseStr = JSON.stringify(responseData);
          const truncatedResponse = responseStr.length > 500 
            ? responseStr.substring(0, 500) + '...' 
            : responseStr;
          this.logger.debug(`📤 Response data: ${truncatedResponse}`);
        }
        
        this.logger.log(`📤 ═══════════════════════════════════════════════════════════════════════`);
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = error.status || error.statusCode || 500;

        // Log error response
        this.logger.error(`💥 ❌ REQUEST ERROR [${requestId}] ══════════════════════════════════════════`);
        this.logger.error(`💥 ${method} ${url} ${statusCode} - ${duration}ms`);
        this.logger.error(`💥 Error: ${error.message || 'Unknown error'}`);
        this.logger.error(`💥 User: ${userInfo}`);
        this.logger.error(`💥 IP: ${ip || 'Unknown'}`);
        
        if (this.debugEnabled && error.stack) {
          this.logger.error(`💥 Stack trace: ${error.stack}`);
        }
        
        this.logger.error(`💥 ═══════════════════════════════════════════════════════════════════════`);
        
        return throwError(() => error);
      }),
    );
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
    
    // Remove unnecessary headers
    delete sanitized['user-agent'];
    delete sanitized.accept;
    delete sanitized['accept-encoding'];
    delete sanitized['accept-language'];
    delete sanitized.connection;
    delete sanitized.host;
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    if (sanitized.password) {
      sanitized.password = '***';
    }
    if (sanitized.confirmPassword) {
      sanitized.confirmPassword = '***';
    }
    if (sanitized.token) {
      sanitized.token = '***';
    }
    if (sanitized.refreshToken) {
      sanitized.refreshToken = '***';
    }
    
    return sanitized;
  }
}
