# 로그 찍는 법

## 3줄 요약

1. `new CustomLogger(클래스이름)`으로 로거를 만든다.
2. `logger.info('메시지', { labels: { 추가정보 } })`로 찍는다.
3. `traceId`·`client.ip` 같은 건 **자동으로 붙으니 넣지 마라.**

## 기본 사용

```ts
import { CustomLogger } from 'src/common/logger/customLogger';

@Injectable()
export class OrderService {
  private readonly logger = new CustomLogger(OrderService.name);

  async create() {
    this.logger.info('주문 생성 시작');

    // ...작업...

    this.logger.info('주문 생성 완료', { labels: { orderId: 1, amount: 5000 } });
  }
}
```

## 레벨 4개

| 메서드 | 언제 |
| --- | --- |
| `logger.debug(...)` | 개발 중 상세 정보 (local 환경에서만 출력됨) |
| `logger.info(...)` | 일반 정보 (정상 흐름) |
| `logger.warn(...)` | 문제는 아니지만 주의할 상황 |
| `logger.error(...)` | 에러 |

```ts
this.logger.debug('중간 계산값', { labels: { step: 2 } });
this.logger.warn('재고 부족', { labels: { productId: 10, remaining: 0 } });
this.logger.error('외부 API 실패', { labels: { status: 500 } });
```

## `labels` — 추가 정보는 여기에

메시지 말고 더 남기고 싶은 값은 전부 `labels`에 넣는다.

```ts
this.logger.info('결제 완료', {
  labels: { userId: 42, method: 'card', amount: 12000 },
});
```

- **평평한 값만** 넣어라 (문자열·숫자·boolean). 중첩 객체 ❌
  ```ts
  // ❌ 이렇게 하지 마
  this.logger.info('x', { labels: { user: { id: 1, name: '홍길동' } } });
  // ✅ 이렇게
  this.logger.info('x', { labels: { userId: 1, userName: '홍길동' } });
  ```

## 하지 말 것

- **`traceId`·`client.ip`를 직접 넣지 마라.** HTTP 요청이면 자동으로 붙는다. (원리는 `../read.md` 참고)
- **`console.log` 쓰지 마라.** ECS 형식으로 안 나가고 traceId도 안 붙는다. 무조건 `CustomLogger`.
- `labels` 말고 다른 top-level 필드(`error`, `event` 등)는 플랫폼용이라 개발자가 직접 안 쓴다.

## 에러를 로그로 남길 때

보통 HTTP 요청 안에서 에러는 **직접 로그로 안 남긴다** — `BusinessException`을 던지면 필터가 알아서 로깅한다. (`../exception/read.md` 참고)

직접 로깅이 필요한 경우(cron 등 필터 밖)에만:

```ts
try {
  await something();
} catch (error) {
  this.logger.error('작업 실패', {
    labels: { jobName: 'cleanup' },
  });
}
```
