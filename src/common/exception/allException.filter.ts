import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExecutionContext } from '../context/executionContext';
import { CustomLogger, OurLoggingSchema } from '../logger/customLogger';

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

    /** BusinessException과 PrismaException 외에는 여기에 fallback 함 */
    const isHttpException = exception instanceof HttpException;

    /** 상태코드 (정의되어있지 않으면 Internal Error) */
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    /**
     * 예상하지 못한 에러(비-HttpException)와 프레임워크의 5xx만 error로 남긴다.
     * ValidationPipe 등이 던지는 4xx는 예상된 흐름이라 warn.
     */

    /** 500이상이면 서버 에러 */
    // eslint-disable-next-line
    const isServerError = status >= HttpStatus.INTERNAL_SERVER_ERROR;

    /**
     * HttpException은 프레임워크·라이브러리가 클라이언트 응답을 고려해 만든
     * 안전한 값이라, 기본 필터처럼 그 메시지를 그대로 사용자에게 노출한다.
     * code는 HTTP status 이름(BAD_REQUEST 등)으로 채워 BusinessException처럼
     * 프론트가 분기할 수 있게 한다. HttpStatus는 역매핑을 지원하는 숫자 enum이라
     * HttpStatus[status]가 'BAD_REQUEST' 같은 키를 돌려준다.
     *
     * 예상 못 한 비-HttpException은 내부 정보 유출을 막기 위해 code·message를 감춘다.
     */
    const code = isHttpException
      ? (HttpStatus[status] ?? 'HTTP_EXCEPTION')
      : 'INTERNAL_SERVER_ERROR';

    const clientMessage = isHttpException
      ? this.extractHttpMessage(exception)
      : '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

    const error: OurLoggingSchema = {
      /** JS는 무엇이든 throw할 수 있어 Error가 아닐 수 있다. */
      error: {
        type: exception instanceof Error ? exception.name : typeof exception,
        /** code */
        ...(isHttpException && { code }),
        message: isHttpException
          ? clientMessage
          : exception instanceof Error
            ? exception.message
            : String(exception),
        /** stack_trace */
        ...(isServerError &&
          exception instanceof Error && { stack_trace: exception.stack }),
      },
    };

    /** 검색성을 위해 top-level message에도 의미 있는 값을 남긴다. */
    const logMessage = isHttpException ? clientMessage : 'Unhandled exception';

    if (isServerError) {
      this.logger.error(logMessage, { ...error });
    } else {
      this.logger.warn(logMessage, { ...error });
    }

    response.status(status).json({
      success: false,
      code,
      message: clientMessage,

      /** 사용자가 문의할 때 이 값으로 로그를 바로 찾을 수 있다. */
      traceId: ExecutionContext.getTraceId(),
    });
  }

  /**
   * HttpException의 실질 메시지를 ECS 로그용 문자열로 정규화한다.
   *
   * getResponse()는 string | object다. ValidationPipe가 던지는
   * BadRequestException처럼 객체({ message: string | string[], ... })인 경우
   * message 필드를 꺼내고, 배열이면 이어 붙인다. exception.message는
   * 'Bad Request' 같은 요약뿐이라 이 상세를 잃지 않도록 우선한다.
   */
  private extractHttpMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    const message = (response as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return exception.message;
  }
}
