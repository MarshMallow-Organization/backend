import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExecutionContext } from '../context/executionContext';
import { CustomLogger, OurLoggingSchema } from '../logger/customLogger';
import { BusinessException } from './businessException';

/**
 * BusinessException을 로깅하고 클라이언트 응답으로 변환한다.
 *
 * 이 필터가 로깅을 전담하므로 서비스 계층에서는 예외를 던지기만 하면 된다.
 * trace.id는 winston 포맷이 요청 컨텍스트에서 자동으로 채운다.
 */
@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger(BusinessExceptionFilter.name);

  catch(exception: BusinessException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const { definition, labels } = exception;

    /**
     * 4xx는 예상된 흐름이므로 warn으로 남긴다.
     * 전부 error로 남기면 알람에서 실제 서버 장애가 묻힌다.
     */
    const isServerError = definition.status >= HttpStatus.INTERNAL_SERVER_ERROR;

    const log: OurLoggingSchema = {
      error: {
        type: exception.name,
        code: definition.code,
        message: definition.message,

        /** 예상된 4xx의 스택은 노이즈일 뿐이라 서버 오류에만 남긴다. */
        ...(isServerError && { stack_trace: exception.stack }),
      },

      ...(labels && { labels }),
    };

    /** 4xx는 예상된 흐름이라 warn, 5xx만 error로 남겨 알람에서 구분되게 한다. */
    if (isServerError) {
      this.logger.error(definition.message, log);
    } else {
      this.logger.warn(definition.message, log);
    }

    response.status(definition.status).json({
      code: definition.code,
      message: definition.message,

      /** 사용자가 문의할 때 이 값으로 로그를 바로 찾을 수 있다. */
      traceId: ExecutionContext.getTraceId(),
    });
  }
}
