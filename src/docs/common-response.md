# 공통 응답 형식

애플리케이션의 HTTP 응답은 전역 `ResponseInterceptor`와 예외 필터를 통해 정상 응답과 오류 응답 형식을 통일한다.

## 정상 응답

컨트롤러가 반환한 값은 전역 `ResponseInterceptor`에 의해 `data` 속성으로 감싸진다.

```json
{
  "data": {}
}
```

예를 들어 컨트롤러가 다음 값을 반환하면,

```json
{
  "items": [],
  "page": 0,
  "size": 10
}
```

클라이언트는 다음 응답을 받는다.

```json
{
  "data": {
    "items": [],
    "page": 0,
    "size": 10
  }
}
```

응답의 제네릭 타입은 다음과 같다.

```ts
type ApiResponse<T> = {
  data: T;
};
```

## 오류 응답

예외가 발생하면 전역 예외 필터가 다음 형식으로 응답한다. 오류 응답은 `data`로 감싸지지 않는다.

```json
{
  "code": "ERROR_CODE",
  "message": "사용자에게 노출할 오류 메시지",
  "traceId": "요청 추적 ID"
}
```

- `code`: 클라이언트가 오류 종류를 구분할 때 사용하는 코드
- `message`: 사용자에게 전달할 수 있는 오류 메시지
- `traceId`: 해당 요청의 서버 로그를 찾기 위한 추적 ID

HTTP 응답 헤더의 `x-request-id`에도 동일한 요청 추적 ID가 포함된다. 요청에 길이 128자 이하의 `x-request-id`가 있으면 해당 값을 이어서 사용하고, 없거나 올바르지 않으면 서버가 UUID를 생성한다.

## BusinessException

서비스에서 `BusinessException`을 발생시키면 `BusinessExceptionFilter`가 오류 정의에 지정된 HTTP 상태와 응답을 사용한다.

```ts
throw new BusinessException(DiariesErrorCode.INVALID_DATE_RANGE, {
  startDate,
  endDate,
});
```

```json
{
  "code": "INVALID_DATE_RANGE",
  "message": "조회 기간 조건이 올바르지 않습니다.",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

예외 생성 시 전달하는 `labels`는 조사를 위한 로그 정보이며 클라이언트 응답에는 포함되지 않는다.

## Prisma 예외

`PrismaExceptionFilter`는 알려진 Prisma 오류를 다음과 같이 변환한다.

| Prisma 코드 | HTTP 상태 | 응답 코드 | 메시지 |
| --- | ---: | --- | --- |
| `P2002` | 409 | `DB_UNIQUE_CONSTRAINT` | 이미 존재하는 값입니다. |
| `P2025` | 404 | `DB_RECORD_NOT_FOUND` | 대상을 찾을 수 없습니다. |
| `P2003` | 409 | `DB_FOREIGN_KEY_CONSTRAINT` | 연관된 데이터가 있어 처리할 수 없습니다. |

매핑되지 않은 Prisma 오류는 내부 정보를 노출하지 않고 다음과 같이 처리한다.

```json
{
  "code": "DB_ERROR",
  "message": "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

이 경우 HTTP 상태는 `500 Internal Server Error`다.

## 그 외 예외

`AllExceptionsFilter`가 비즈니스 예외와 Prisma 예외를 제외한 나머지 오류를 처리한다.

- NestJS `HttpException`은 해당 HTTP 상태를 유지한다.
- 응답 코드는 `BAD_REQUEST`, `NOT_FOUND`처럼 HTTP 상태 이름을 사용한다.
- DTO 검증 메시지가 여러 개면 쉼표로 연결해 하나의 `message`로 반환한다.
- 예상하지 못한 일반 오류는 HTTP 500, 코드 `INTERNAL_SERVER_ERROR`로 변환하고 내부 오류 내용은 숨긴다.

예상하지 못한 오류의 응답 예시는 다음과 같다.

```json
{
  "code": "INTERNAL_SERVER_ERROR",
  "message": "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 로깅 기준

- HTTP 4xx 오류는 `warn` 레벨로 기록한다.
- HTTP 5xx 오류는 `error` 레벨로 기록한다.
- 클라이언트가 받은 `traceId`로 같은 요청에서 발생한 로그를 추적할 수 있다.
