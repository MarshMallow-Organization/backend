import { HttpStatus } from '@nestjs/common';

/**
 * 서비스별 에러 코드 정의.
 *
 * 각 도메인은 이 형태의 카탈로그를 만들고, 개발자는 카탈로그의 항목을
 * BusinessException에 넘기기만 하면 된다. 로깅과 응답 생성은 필터가 담당한다.
 *
 * message는 클라이언트에 그대로 노출되므로 사용자 관점의 문구만 담는다.
 * 조사에 필요한 구체적인 값은 BusinessException의 labels로 전달한다.
 */
export interface ErrorDefinition {
  /** 서비스 전체에서 유일해야 한다. 로그 검색 및 클라이언트 분기의 기준이 된다. */
  readonly code: string;

  /** 클라이언트에 내려줄 HTTP 상태 코드. 로그 레벨도 이 값에서 파생된다. */
  readonly status: HttpStatus;

  /** 사용자 노출용 메시지. 내부 구현 정보를 담지 않는다. */
  readonly message: string;
}

/**
 * 카탈로그 정의를 도와주는 헬퍼.
 *
 * satisfies를 사용해 각 항목의 리터럴 타입은 좁게 유지하면서
 * ErrorDefinition 형식만 강제한다.
 *
 * @example
 * export const OrderErrorCode = defineErrorCodes({
 *   ORDER_NOT_FOUND: {
 *     code: 'ORDER_NOT_FOUND',
 *     status: HttpStatus.NOT_FOUND,
 *     message: '주문을 찾을 수 없습니다.',
 *   },
 * });
 */
export const defineErrorCodes = <T extends Record<string, ErrorDefinition>>(
  codes: T,
): Readonly<T> => Object.freeze(codes);
