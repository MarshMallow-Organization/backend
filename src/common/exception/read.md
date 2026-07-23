# 에러 던지는 법

## 3줄 요약

1. 도메인마다 에러 목록을 `defineErrorCodes`로 정의한다.
2. `throw new BusinessException(에러코드, { 추가정보 })`로 던진다.
3. **로깅도 응답도 필터가 알아서 한다. 직접 try-catch로 로그 찍지 마라.**

## 1단계: 에러 목록 정의

도메인 폴더에 에러 카탈로그를 하나 만든다.

```ts
import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const OrderErrorCode = defineErrorCodes({
  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND', // 클라이언트가 분기·로그 검색에 쓰는 고유값
    status: HttpStatus.NOT_FOUND, // 내려줄 HTTP 상태
    message: '주문을 찾을 수 없습니다.', // 사용자에게 그대로 보이는 문구
  },
  ORDER_ALREADY_PAID: {
    code: 'ORDER_ALREADY_PAID',
    status: HttpStatus.CONFLICT,
    message: '이미 결제된 주문입니다.',
  },
});
```

- `message`는 **사용자에게 그대로 노출**된다. 내부 사정(스택·쿼리 등)은 절대 넣지 마라.
- `code`는 서비스 전체에서 유일해야 한다.

## 2단계: 던지기

```ts
async findOrder(orderId: number) {
  const order = await this.repo.find(orderId);

  if (!order) {
    // 이게 끝. 로그도 응답도 신경 쓸 필요 없다.
    throw new BusinessException(OrderErrorCode.ORDER_NOT_FOUND, { orderId });
  }

  return order;
}
```

이렇게 하면 자동으로:

- 클라이언트에 `{ code, message, traceId }`로 응답 (위에서 정한 status로)
- 서버 로그에 자동 기록 (4xx는 warn, 5xx는 error)

(중요) 두 번째 인자 `{ orderId }`는 **조사용 값(labels)**이다. 로그에만 남고 클라이언트엔 안 나간다. 디버깅에 필요한 값을 넣어라.

## 하지 말 것

```ts
// ❌ 이렇게 하지 마 — 중복 로깅에 응답도 직접 만들어야 함
try {
  ...
} catch (e) {
  this.logger.error('주문 못 찾음');       // 필터가 이미 함
  throw new HttpException('...', 404);      // 필터가 이미 함
}

// ✅ 그냥 던지면 끝
throw new BusinessException(OrderErrorCode.ORDER_NOT_FOUND, { orderId });
```

## 예상 못한 에러는?

네가 정의 안 한 에러(`TypeError`, DB 장애 등)는 **아무것도 안 해도 된다.** 그냥 두면:

- Prisma 에러 → `PrismaExceptionFilter`가 처리
- 그 외 전부 → `AllExceptionsFilter`가 500으로 처리 + error 로깅

즉 **네가 예상한 실패만 `BusinessException`으로 던지고, 나머지는 플랫폼이 알아서 잡는다.** (전체 구조는 `../read.md` 참고)

## HTTP 밖(cron 등)에서는?

필터는 HTTP 요청만 잡는다. cron·백그라운드 작업에서는 `BusinessException`을 던져도 필터가 못 잡으니, 직접 try-catch로 처리해야 한다. (`../context/read.md` 참고)
