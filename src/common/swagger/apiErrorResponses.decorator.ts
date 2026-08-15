import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
  defineErrorCodes,
  ErrorDefinition,
} from '../exception/errorDefinition';
import { ErrorResponseDto } from './errorResponse.dto';

/** 문서의 예시에만 쓰는 고정 traceId. 실제 값은 요청마다 새로 발급된다. */
const EXAMPLE_TRACE_ID = '3f6b1c8e-1f0e-4a1d-9d3c-2b7a9f5e4c11';

/**
 * 도메인 카탈로그에 없는 공통 실패 응답.
 *
 * ValidationPipe·가드·폴백 필터가 만들어내는 것들이라 특정 도메인에
 * 속하지 않는다. AllExceptionsFilter가 code를 HTTP 상태 이름으로 채우므로
 * 코드 값도 그 규칙을 따른다.
 */
export const CommonErrorCode = defineErrorCodes({
  /** ValidationPipe(DTO)·ParseStockCodePipe(경로 파라미터)의 형식 오류. */
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    status: HttpStatus.BAD_REQUEST,
    message: 'stockCode는 6자리 숫자여야 합니다.',
  },

  /** 가드 통과 실패. 현재는 StubAuthGuard가 던진다. */
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    status: HttpStatus.UNAUTHORIZED,
    message: '인증이 필요합니다.',
  },

  /** 예상하지 못한 예외. 내부 정보를 감춘 고정 문구가 나간다. */
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
});

/**
 * 에러 카탈로그 항목을 그대로 실패 응답 문서로 바꾼다.
 *
 * 코드와 메시지를 문서에 손으로 다시 적으면 카탈로그가 바뀔 때 문서만
 * 옛날 값으로 남는다. 카탈로그를 인자로 받아 단일 출처를 유지한다.
 *
 * 하나의 상태 코드에 응답을 하나만 달 수 있는 OpenAPI 제약 때문에,
 * 같은 status를 쓰는 항목들(예: 409를 쓰는 이름 중복·개수 초과)은 한
 * 응답으로 합치고 examples로 나눠 보여준다.
 *
 * @example
 * ＠ApiErrorResponses(
 *   CommonErrorCode.UNAUTHORIZED,
 *   FavoriteStocksErrorCode.FAVORITE_STOCK_NOT_FOUND,
 * )
 */
export const ApiErrorResponses = (
  ...definitions: readonly ErrorDefinition[]
) => {
  const byStatus = new Map<HttpStatus, ErrorDefinition[]>();

  for (const definition of definitions) {
    const bucket = byStatus.get(definition.status) ?? [];
    bucket.push(definition);
    byStatus.set(definition.status, bucket);
  }

  const responses = [...byStatus].map(([status, group]) =>
    ApiResponse({
      status,
      description: group
        .map(({ code, message }) => `\`${code}\` — ${message}`)
        .join('\n\n'),
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(ErrorResponseDto) },
          examples: Object.fromEntries(
            group.map(({ code, message }) => [
              code,
              {
                summary: code,
                value: { code, message, traceId: EXAMPLE_TRACE_ID },
              },
            ]),
          ),
        },
      },
    }),
  );

  return applyDecorators(ApiExtraModels(ErrorResponseDto), ...responses);
};
