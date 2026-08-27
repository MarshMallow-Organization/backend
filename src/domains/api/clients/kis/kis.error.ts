import { HttpStatus } from '@nestjs/common';
import {
  defineErrorCodes,
  ErrorDefinition,
} from 'src/common/exception/errorDefinition';
import {
  BusinessException,
  ErrorLabels,
} from 'src/common/exception/businessException';
import { KisErrorResponse } from './kis.types';

/**
 * 기본 한국투자증권(KIS) 에러 정의 (폴백용)
 */
export const KisErrorCode = defineErrorCodes({
  EXTERNAL_API_UNAVAILABLE: {
    code: 'KIS_API_UNAVAILABLE',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      '한국투자증권 서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
  },
  AUTHENTICATION_FAILED: {
    code: 'KIS_AUTH_FAILED',
    status: HttpStatus.UNAUTHORIZED,
    message: '한국투자증권 API 인증에 실패했습니다.',
  },
  DEFAULT_ERROR: {
    code: 'KIS_API_ERROR',
    status: HttpStatus.BAD_REQUEST,
    message: '한국투자증권 API 처리 중 오류가 발생했습니다.',
  },
});

/**
 * KIS API의 HTTP 상태 코드, 응답 헤더 및 본문을 분석하여
 * KIS에서 내려준 한글 메시지, 에러 코드 및 디버깅용 정보를 담아 BusinessException을 던집니다.
 *
 * @param status HTTP 상태 코드 (기본 200/400/500 등)
 * @param rawBody 외부 API 원본 에러 응답 내용 (문자열 또는 객체)
 * @param headers 응답 헤더
 * @param labels 디버깅/추적용 라벨
 */
export function throwKisException(
  status: number,
  rawBody: unknown,
  headers?: Headers | Record<string, string> | null,
  labels?: Record<string, string | number | boolean | null>,
): never {
  let parsedError: KisErrorResponse | null = null;
  let rawErrorStr = '';

  if (typeof rawBody === 'string') {
    rawErrorStr = rawBody;
    try {
      const json = JSON.parse(rawBody) as KisErrorResponse;
      if (json && typeof json === 'object') {
        parsedError = json;
      }
    } catch {
      // JSON 파싱 실패 시 원본 문자열 유지
    }
  } else if (rawBody && typeof rawBody === 'object') {
    rawErrorStr = JSON.stringify(rawBody);
    parsedError = rawBody;
  }

  // 1. KIS 응답 코드 추출 (msg_cd 또는 error_code)
  const rawCode =
    parsedError?.msg_cd || parsedError?.error_code || `HTTP_${status}`;
  const kisCode = rawCode.startsWith('KIS_')
    ? rawCode
    : `KIS_${rawCode.toUpperCase().replace(/-/g, '_')}`;

  // 2. KIS 한글 메시지 추출 (msg1 또는 error_description)
  const kisMessage =
    parsedError?.msg1 ||
    parsedError?.error_description ||
    (status >= 500
      ? KisErrorCode.EXTERNAL_API_UNAVAILABLE.message
      : status === 401
        ? KisErrorCode.AUTHENTICATION_FAILED.message
        : KisErrorCode.DEFAULT_ERROR.message);

  const errorDefinition: ErrorDefinition = {
    code: kisCode,
    status: status >= 400 ? status : HttpStatus.BAD_REQUEST,
    message: kisMessage,
  };

  const errorLabels: ErrorLabels = {
    ...labels,
    httpStatus: status,
    kisMsgCd: parsedError?.msg_cd ?? null,
    kisErrorCode: parsedError?.error_code ?? null,
    kisRtCd: parsedError?.rt_cd ?? null,
    rawError: rawErrorStr.slice(0, 300),
  };

  throw new BusinessException(errorDefinition, errorLabels);
}
