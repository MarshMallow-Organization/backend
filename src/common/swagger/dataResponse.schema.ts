import { getSchemaPath } from '@nestjs/swagger';

/** getSchemaPath가 받는 모델 참조. DTO 클래스 또는 스키마 이름 문자열. */
type SchemaModel = Parameters<typeof getSchemaPath>[0];

/**
 * 성공 응답을 감싸는 `{ data: T }` 스키마를 만든다.
 *
 * 전역 ResponseInterceptor가 컨트롤러 반환값을 `{ data }`로 감싸는데,
 * Swagger 플러그인은 런타임 인터셉터의 변환을 알 수 없어 컨트롤러에서
 * 실제 구조를 직접 써 줘야 한다(src/docs/swagger-api.md 참고).
 *
 * 엔드포인트마다 같은 8줄을 반복하게 되어 공용으로 뺀다. 도메인이 아니라
 * common에 두는 이유는 인터셉터 자체가 전역이라 모든 도메인이 같은 형태를
 * 쓰기 때문이다.
 *
 * 이 헬퍼를 쓸 때는 참조하는 DTO를 컨트롤러의 @ApiExtraModels()에 함께
 * 등록해야 한다. $ref만 있으면 문서에 스키마 본문이 실리지 않는다.
 *
 * 반환 타입은 SchemaObject로 명시하지 않고 추론에 맡긴다. 그 타입은
 * @nestjs/swagger의 exports 맵이 막아 둔 하위 경로에만 있어 import할 수
 * 없다. type만 리터럴로 고정하면 데코레이터 옵션에 그대로 들어간다.
 *
 * @example
 * @ApiOkResponse({ schema: dataSchema(PortfolioListResponseDto) })
 */
export const dataSchema = (model: SchemaModel) => ({
  type: 'object' as const,
  required: ['success', 'code', 'message', 'data'],
  properties: {
    success: { type: 'boolean' as const, example: true },
    code: { type: 'string' as const, example: '200' },
    message: { type: 'string' as const, example: '요청에 성공하였습니다.' },
    data: { $ref: getSchemaPath(model) },
  },
});
