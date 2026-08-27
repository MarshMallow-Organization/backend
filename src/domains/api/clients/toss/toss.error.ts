import { HttpStatus } from '@nestjs/common';
import {
  defineErrorCodes,
  ErrorDefinition,
} from 'src/common/exception/errorDefinition';
import {
  BusinessException,
  ErrorLabels,
} from 'src/common/exception/businessException';
import { TossErrorEnvelope } from './toss.types';

/**
 * 기본 토스 에러 정의 (폴백용)
 */
export const TossErrorCode = defineErrorCodes({
  EXTERNAL_API_UNAVAILABLE: {
    code: 'TOSS_API_UNAVAILABLE',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      '증권사 서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
  },
  AUTHENTICATION_FAILED: {
    code: 'TOSS_AUTH_FAILED',
    status: HttpStatus.UNAUTHORIZED,
    message: '증권사 API 인증에 실패했습니다.',
  },
  ACCOUNT_NOT_CONNECTED: {
    code: 'TOSS_ACCOUNT_NOT_CONNECTED',
    status: HttpStatus.BAD_REQUEST,
    message: '토스 증권 계좌가 연동되어 있지 않습니다.',
  },
  DEFAULT_ERROR: {
    code: 'TOSS_API_ERROR',
    status: HttpStatus.BAD_REQUEST,
    message: '증권사 API 처리 중 오류가 발생했습니다.',
  },
});

/**
 * 토스 API의 HTTP 상태 코드, 응답 헤더 및 본문(Envelope)을 분석하여
 * 토스에서 내려준 한글 메시지, 에러 코드 및 CS 문의용 추적 ID들을 담아 BusinessException을 던집니다.
 *
 * 토스 에러 규격:
 * {
 *   "error": {
 *     "requestId": "01HXYZABCDEFG123456789",
 *     "code": "invalid-request",
 *     "message": "주문 방향이 올바르지 않습니다.",
 *     "data": { "field": "side", "allowedValues": ["BUY", "SELL"] }
 *   }
 * }
 *
 * @param status HTTP 상태 코드
 * @param rawBody 외부 API 원본 에러 응답 내용 (문자열 또는 객체)
 * @param headers 응답 헤더 (X-Request-Id, referenceId, x-amz-cf-id 추출용)
 * @param labels 디버깅/추적용 라벨
 */
export function throwTossException(
  status: number,
  rawBody: unknown,
  headers?: Headers | Record<string, string> | null,
  labels?: Record<string, string | number | boolean | null>,
): never {
  let parsedError: TossErrorEnvelope['error'] | null = null;
  let rawErrorStr = '';

  if (typeof rawBody === 'string') {
    rawErrorStr = rawBody;
    try {
      const json: unknown = JSON.parse(rawBody);
      if (json && typeof json === 'object' && 'error' in json) {
        const errorObj = (json as Record<string, unknown>).error;
        if (errorObj && typeof errorObj === 'object') {
          parsedError = errorObj as TossErrorEnvelope['error'];
        }
      }
    } catch {
      // JSON 파싱 실패 시 원본 문자열 유지
    }
  } else if (rawBody && typeof rawBody === 'object') {
    rawErrorStr = JSON.stringify(rawBody);
    if ('error' in rawBody) {
      const errorObj = (rawBody as Record<string, unknown>).error;
      if (errorObj && typeof errorObj === 'object') {
        parsedError = errorObj as TossErrorEnvelope['error'];
      }
    }
  }

  // 1. 헤더에서 CS 문의용 식별자 추출 (X-Request-Id, referenceId, x-amz-cf-id)
  const getHeader = (name: string): string | null => {
    if (!headers) return null;
    if (typeof (headers as Headers).get === 'function') {
      return (
        (headers as Headers).get(name) ||
        (headers as Headers).get(name.toLowerCase())
      );
    }
    const record = headers as Record<string, string>;
    return record[name] || record[name.toLowerCase()] || null;
  };

  const headerRequestId = getHeader('X-Request-Id');
  const headerReferenceId = getHeader('referenceId');
  const headerAmzCfId = getHeader('x-amz-cf-id');

  // CS 문의용 최우선 requestId 결정
  const finalRequestId =
    parsedError?.requestId ||
    headerRequestId ||
    parsedError?.referenceId ||
    headerReferenceId ||
    headerAmzCfId ||
    null;

  // 2. 토스가 전달한 code 추출 (예: 'invalid-request' -> 'TOSS_INVALID_REQUEST')
  const tossCode = parsedError?.code
    ? `TOSS_${parsedError.code.toUpperCase().replace(/-/g, '_')}`
    : `TOSS_HTTP_${status}`;

  // 3. 토스가 전달한 한글 에러 메시지 추출 (예: "주문 방향이 올바르지 않습니다.")
  const tossMessage =
    parsedError?.message ||
    (status >= 500
      ? TossErrorCode.EXTERNAL_API_UNAVAILABLE.message
      : TossErrorCode.DEFAULT_ERROR.message);

  const errorDefinition: ErrorDefinition = {
    code: tossCode,
    status: status,
    message: tossMessage,
  };

  // 4. 에러 해결 힌트(data) 문자열화
  const dataHint = parsedError?.data ? JSON.stringify(parsedError.data) : null;

  const errorLabels: ErrorLabels = {
    ...labels,
    httpStatus: status,
    tossRequestId: finalRequestId,
    tossReferenceId: parsedError?.referenceId || headerReferenceId || null,
    tossAmzCfId: headerAmzCfId || null,
    tossCode: parsedError?.code ?? null,
    tossDataHint: dataHint,
    rawError: rawErrorStr.slice(0, 300),
  };

  throw new BusinessException(errorDefinition, errorLabels);
}
