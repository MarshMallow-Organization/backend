import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from 'src/generated/prisma/client';
import { ExecutionContext } from '../context/executionContext';
import { CustomLogger } from '../logger/customLogger';

/** Prisma 에러를 클라이언트 응답으로 변환하기 위한 매핑. */
interface PrismaErrorMapping {
  readonly status: HttpStatus;
  readonly code: string;
  /** 사용자 노출용 메시지. Prisma 원본 메시지는 스키마 정보가 있어 쓰지 않는다. */
  readonly message: string;
}

/**
 * 자주 발생하고 사용자 행동으로 이어지는 known request 에러만 명시적으로 매핑한다.
 * 여기 없는 코드는 개발자가 예상하지 못한 것이므로 500으로 폴백한다.
 */
const KNOWN_REQUEST_ERROR_MAP: Readonly<Record<string, PrismaErrorMapping>> = {
  /** 유니크 제약 위반 */
  P2002: {
    status: HttpStatus.CONFLICT,
    code: 'DB_UNIQUE_CONSTRAINT',
    message: '이미 존재하는 값입니다.',
  },

  /** update/delete 대상 레코드가 없음 */
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: 'DB_RECORD_NOT_FOUND',
    message: '대상을 찾을 수 없습니다.',
  },

  /** 외래 키 제약 위반 */
  P2003: {
    status: HttpStatus.CONFLICT,
    code: 'DB_FOREIGN_KEY_CONSTRAINT',
    message: '연관된 데이터가 있어 처리할 수 없습니다.',
  },
};

/** 매핑되지 않은 모든 Prisma 에러의 기본 응답. */
const FALLBACK: PrismaErrorMapping = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'DB_ERROR',
  message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

/**
 * ORM(Prisma) 계층에서 발생한 예외를 로깅하고 클라이언트 응답으로 변환한다.
 *
 * 알려진 제약 위반(유니크·FK·레코드 없음)은 적절한 4xx로 내려주고,
 * 그 외 잘못된 쿼리·초기화 실패·패닉 등은 개발자가 고쳐야 할 버그이므로
 * 500으로 감싸고 내부 정보를 노출하지 않는다.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger(PrismaExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const mapping = this.resolveMapping(exception);
    const isServerError = mapping.status >= HttpStatus.INTERNAL_SERVER_ERROR;

    const log = {
      error: {
        type: exception.name,
        code: mapping.code,

        /** Prisma 원본 메시지엔 쿼리/스키마 정보가 있어 로그에만 남긴다. */
        message: exception.message,

        /** 예상 못 한 서버 오류에만 스택을 남긴다. */
        ...(isServerError && { stack_trace: exception.stack }),
      },

      /** Prisma 코드(P2002 등)는 조사용 값이라 labels로 남긴다. */
      ...(exception instanceof Prisma.PrismaClientKnownRequestError && {
        labels: { prisma_code: exception.code },
      }),
    };

    if (isServerError) {
      this.logger.error(mapping.message, log);
    } else {
      this.logger.warn(mapping.message, log);
    }

    response.status(mapping.status).json({
      success: false,
      code: mapping.code,
      message: mapping.message,

      /** 사용자가 문의할 때 이 값으로 로그를 바로 찾을 수 있다. */
      traceId: ExecutionContext.getTraceId(),
    });
  }

  private resolveMapping(exception: Error): PrismaErrorMapping {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return KNOWN_REQUEST_ERROR_MAP[exception.code] ?? FALLBACK;
    }

    /**
     * ValidationError(잘못된 쿼리)·InitializationError·RustPanicError·
     * UnknownRequestError는 모두 우리가 예상하지 못한 상황이므로 500으로 처리한다.
     */
    return FALLBACK;
  }
}
