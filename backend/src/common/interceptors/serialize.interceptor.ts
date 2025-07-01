import { UseInterceptors, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToClass } from 'class-transformer';

interface ClassConstructor {
  new (...args: any[]): {};
}

export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: any) {}

  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    return handler.handle().pipe(
      map((data: any) => {
        if (Array.isArray(data)) {
          return data.map((item: any) =>
            plainToClass(this.dto, item, {
              excludeExtraneousValues: true,
            }),
          );
        }

        if (data && typeof data === 'object' && data.data) {
          // Handle wrapped responses
          return {
            ...data,
            data: Array.isArray(data.data)
              ? data.data.map((item: any) =>
                  plainToClass(this.dto, item, { excludeExtraneousValues: true }),
                )
              : plainToClass(this.dto, data.data, { excludeExtraneousValues: true }),
          };
        }

        return plainToClass(this.dto, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
