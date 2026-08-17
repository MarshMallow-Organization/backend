# Swagger API 문서화 가이드

## 현재 프로젝트 설정

이 프로젝트는 `@nestjs/swagger`와 Nest CLI Swagger 플러그인을 함께 사용한다.
Swagger UI와 OpenAPI JSON은 `src/main.ts`에서 등록하며, 개발 서버 실행 후 다음 경로에서 확인한다.

- Swagger UI: `http://localhost:3000/swagger`
- OpenAPI JSON: `http://localhost:3000/swagger-json`

실제 포트가 다르면 `3000`을 해당 포트로 바꾼다.

`nest-cli.json`에는 다음 플러그인 설정이 적용되어 있다.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true,
          "dtoFileNameSuffix": [".dto.ts", ".entity.ts"]
        }
      }
    ]
  }
}
```

## 플러그인이 동작하는 방식

플러그인은 Nest CLI 빌드 시 `.dto.ts`, `.entity.ts` 파일에 OpenAPI 메타데이터 팩토리를 자동 생성한다. 소스 파일에 데코레이터를 기계적으로 추가하는 방식은 아니다. 따라서 설정 변경 후에는 반드시 Nest CLI를 통해 다시 빌드하거나 실행해야 한다.

```bash
yarn build
yarn dev
```

DTO 파일 이름이 `dtoFileNameSuffix`에 포함되지 않으면 자동 처리가 되지 않는다. 새 DTO는 `*.dto.ts`로 작성한다. 타입 전용 객체나 `*.model.ts`는 API 계약에 직접 노출하지 말고 응답 DTO로 변환한다.

현재 옵션별 역할은 다음과 같다.

| 옵션                 | 역할                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `classValidatorShim` | `@Min`, `@Max`, `@MaxLength` 등 지원되는 `class-validator` 조건을 OpenAPI 제약으로 변환한다. |
| `introspectComments` | DTO 속성의 JSDoc 설명과 `@example` 값을 스키마에 반영한다.                                   |
| `dtoFileNameSuffix`  | 플러그인이 처리할 파일 접미사를 지정한다.                                                    |

## DTO 작성 규칙

일반적인 타입, 배열, 필수 여부와 검증 범위는 TypeScript 타입, `class-validator`, JSDoc으로 작성한다.

```typescript
export class GetDiariesQueryDto {
  /** 0부터 시작하는 페이지 번호.
   * @example 0
   */
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;
}
```

이 경우 플러그인이 `number`, 선택 속성, 최솟값, 설명과 예시를 생성한다. 런타임에서 적용하는 기본값처럼 플러그인이 추론할 수 없는 정보만 `@ApiPropertyOptional()`로 보완한다.

다음 정보는 플러그인이 비즈니스 의도대로 추론하지 못할 수 있으므로 `@ApiProperty()` 또는 `@ApiPropertyOptional()`로 명시한다.

- `null`을 허용하는 속성의 `nullable: true`
- 서비스에서 적용하는 기본값의 `default`
- 조건부 필수 필드와 조건부 금지 필드
- 구체적인 enum 표현이나 다형성(`oneOf`, discriminator)
- 자동 추론과 다른 배열/중첩 DTO 타입
- 특별한 `format`, 현실적인 예시 등 계약 이해에 꼭 필요한 정보

수동 데코레이터가 있으면 해당 속성에 대해 자동 생성된 값보다 명시한 옵션이 우선한다. 현재 `PostDiariesDto`의 BUY/SELL 조건부 필드와 `DiaryPreviewDto`의 nullable 필드가 이에 해당한다.

`class-validator`는 런타임 검증, Swagger 메타데이터는 문서화를 담당한다. 문서에 제약이 표시되더라도 검증 데코레이터를 생략해서는 안 된다.

## Controller 작성 규칙

CLI 플러그인이 DTO 스키마와 일부 Controller 응답 타입을 보조하지만 API의 의미와 모든 실패 응답을 알 수는 없다. Controller에는 다음 내용을 직접 작성한다.

- `@ApiTags()`: 도메인 그룹
- `@ApiOperation()`: 요약과 동작 설명
- `@ApiHeader()`, `@ApiParam()`: 커스텀 입력값
- `@ApiOkResponse()`, `@ApiCreatedResponse()`: 실제 성공 상태와 응답 스키마
- `@ApiBadRequestResponse()` 등: 주요 오류 상태, 오류 코드와 조건
- `@ApiBearerAuth()`: 실제 Bearer 인증 Guard가 적용된 API

Diaries는 현재 JWT가 아니라 `StubAuthGuard`를 사용하므로 `@ApiBearerAuth()` 대신 선택적인 `x-stub-user-id` 헤더를 문서화한다. `STUB_AUTH_ENABLED=true`가 아니면 요청은 401을 반환한다. 실제 JWT Guard로 교체할 때 헤더 문서를 제거하고 `@ApiBearerAuth()`를 적용한다.

## `{ data: T }` 성공 응답

전역 `ResponseInterceptor`가 Controller 반환값을 다음 형태로 감싼다.

```json
{
  "data": {
    "items": [],
    "page": 0
  }
}
```

플러그인은 런타임 인터셉터의 변환을 자동으로 알 수 없다. 따라서 성공 응답은 Controller에서 실제 구조를 명시한다.

```typescript
@ApiExtraModels(GetDiariesResponseDto)
@ApiOkResponse({
  schema: {
    type: 'object',
    required: ['data'],
    properties: {
      data: { $ref: getSchemaPath(GetDiariesResponseDto) },
    },
  },
})
```

오류 응답은 인터셉터로 감싸지지 않고 다음 형태를 사용한다.

```json
{
  "code": "ORDER_NOT_FOUND",
  "message": "주문을 찾을 수 없습니다.",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Diaries Controller는 이 형식을 `DiaryErrorResponseDto`로 등록한다.

## Diaries 적용 범위

`src/domains/diaries`에는 다음 항목이 문서화되어 있다.

- `POST /diaries`: 요청 본문, 201 성공 응답, 400/401/404/409 오류
- `GET /diaries`: Query 필터, 200 성공 응답, 400/401 오류
- 요청 DTO: 타입, 선택 여부, 검증 범위, enum, 조건부 필드와 예시
- 응답 DTO: 중첩 목록, 페이지 정보, nullable 속성과 예시
- 스텁 인증용 `x-stub-user-id` 헤더

서비스·Repository 내부에서만 사용하는 `*.model.ts` 타입은 HTTP API 계약이 아니므로 Swagger 대상에서 제외한다. 비어 있고 어떤 API에서도 사용하지 않는 `update-diary.dto.ts` 역시 현재 생성되는 엔드포인트가 없어 문서에 노출되지 않는다.

## 검증 방법

```bash
yarn build
yarn dev
```

빌드 후 Swagger UI 또는 `/swagger-json`에서 다음을 확인한다.

- `Diaries` 태그 아래 GET/POST가 표시되는가?
- Query와 Body의 필수 여부, enum, 배열, 최솟값·최댓값이 맞는가?
- 성공 응답이 `{ data: ... }` 구조인가?
- nullable 속성이 `null`을 허용하는가?
- 400/401/404/409 응답과 오류 DTO가 표시되는가?
- `x-stub-user-id`를 입력해 `Try it out`을 실행할 수 있는가?

Swagger 문서는 API 계약이다. DTO나 Controller를 변경할 때 JSDoc, 명시적 Swagger 옵션과 오류 응답도 함께 갱신한다.
