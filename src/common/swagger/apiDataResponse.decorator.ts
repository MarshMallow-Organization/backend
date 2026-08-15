import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

type ApiDataResponseOptions = {
  /** 기본값 200. 생성 계열은 201을 넘긴다. */
  status?: HttpStatus;

  /** Swagger UI의 응답 설명란에 표시된다. */
  description?: string;

  /** data가 배열인 경우 true. */
  isArray?: boolean;
};

/**
 * 성공 응답을 ResponseInterceptor의 `{ data: T }` 형태로 문서화한다.
 *
 * 핸들러의 반환 타입은 T지만 실제로 나가는 본문은 한 겹 감싸인
 * `{ data: T }`다. @ApiResponse({ type: T })를 그대로 쓰면 이 래퍼가
 * 문서에서 사라져 프론트가 `response.data.data`를 `response.data`로
 * 착각하게 되므로, 스키마를 직접 조립해 래퍼를 드러낸다.
 *
 * 모델은 $ref로 참조하므로 ApiExtraModels로 등록해야 한다. 응답 DTO는
 * 핸들러 반환 타입으로만 등장해 Swagger가 자동 수집하지 못하는 경우가
 * 있어 여기서 함께 등록한다.
 *
 * @example
 * ＠ApiDataResponse(FavoriteStockItemDto, { status: HttpStatus.CREATED })
 * // → { "data": { "id": 1, "stockCode": "005930", ... } }
 */
export const ApiDataResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options: ApiDataResponseOptions = {},
) => {
  const { status = HttpStatus.OK, description, isArray = false } = options;

  const data = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['data'],
        properties: { data },
      },
    }),
  );
};
