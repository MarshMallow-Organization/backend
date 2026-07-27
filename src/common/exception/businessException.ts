import { ErrorDefinition } from './errorDefinition';

/**
 * ECS labels에 담을 수 있는 값.
 *
 * 중첩 객체를 허용하면 Elasticsearch 매핑이 무한정 늘어나므로
 * 평평한 스칼라 값만 받는다.
 */
export type ErrorLabels = Record<string, string | number | boolean | null>;

/**
 * 개발자가 정의한 비즈니스 규칙 위반을 나타내는 예외.
 *
 * 던지기만 하면 BusinessExceptionFilter가 로깅과 응답 생성을 모두 처리한다.
 * 호출부에서 별도로 로그를 남길 필요가 없다.
 *
 * @example
 * throw new BusinessException(OrderErrorCode.ORDER_NOT_FOUND, { orderId });
 */
export class BusinessException extends Error {
  constructor(
    readonly definition: ErrorDefinition,

    /** 조사에 필요한 값. 로그에만 남고 클라이언트 응답에는 포함되지 않는다. */
    readonly labels?: ErrorLabels,
  ) {
    super(definition.message);

    this.name = BusinessException.name;

    /** 스택에서 이 생성자 프레임을 제거해 실제 발생 지점이 먼저 오도록 한다. */
    Error.captureStackTrace(this, BusinessException);
  }
}
