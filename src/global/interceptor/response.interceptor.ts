import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ApiResponse<T> = {
  success: true;
  code: string;
  message: string;
  data: T;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        /** 실제 응답 상태 코드(200/201 등)를 문자열로 그대로 노출한다. */
        code: String(response.statusCode),
        message: '요청에 성공하였습니다.',
        data,
      })),
    );
  }
}
