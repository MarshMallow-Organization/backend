import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequestContext } from '../context/requestContext';
import { CustomLogger } from '../logger/customLogger';

/**
 * 다른 필터가 처리하지 않은 모든 예외의 최종 방어선.
 *
 * BusinessException·Prisma 에러는 각자의 전용 필터가 담당하고,
 * 이 필터는 그 외의 것 — NestJS 프레임워크 예외(ValidationPipe 등)와
 * 우리가 예상하지 못한 모든 에러 — 를 처리한다.
 *
 * @Catch()를 인자 없이 선언하면 catch-all이 된다. NestJS 전역 필터는
 * 등록의 역순으로 매칭되므로, 이 필터는 반드시 가장 먼저 등록해야
 * 전용 필터보다 낮은 우선순위(폴백)로 동작한다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    /**
     * 예상하지 못한 에러(비-HttpException)와 프레임워크의 5xx만 error로 남긴다.
     * ValidationPipe 등이 던지는 4xx는 예상된 흐름이라 warn.
     */

    // eslint-disable-next-line
    const isServerError = status >= HttpStatus.INTERNAL_SERVER_ERROR;

    const logMessage = isHttpException
      ? exception.message
      : 'Unhandled exception';

    const error = {
      /** JS는 무엇이든 throw할 수 있어 Error가 아닐 수 있다. */
      type: exception instanceof Error ? exception.name : typeof exception,
      message:
        exception instanceof Error ? exception.message : String(exception),

      /** 스택은 Error 인스턴스이면서 서버 오류일 때만 남긴다. */
      ...(isServerError &&
        exception instanceof Error && { stack_trace: exception.stack }),
    };

    if (isServerError) {
      this.logger.error(logMessage, { error });
    } else {
      this.logger.warn(logMessage, { error });
    }

    response.status(status).json({
      /**
       * HttpException은 프레임워크가 만든 사용자 안전 메시지라 그대로 노출하고,
       * 예상 못 한 에러의 원본 메시지는 내부 정보 유출을 막기 위해 감춘다.
       */
      code: isHttpException ? 'HTTP_EXCEPTION' : 'INTERNAL_SERVER_ERROR',
      message: isHttpException
        ? exception.message
        : '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',

      /** 사용자가 문의할 때 이 값으로 로그를 바로 찾을 수 있다. */
      traceId: RequestContext.getTraceId(),
    });
  }
}
