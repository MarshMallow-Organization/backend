# 실행 컨텍스트 사용법

## 먼저: HTTP 개발자는 거의 신경 쓸 필요 없다

`traceId`·`client.ip`는 HTTP 요청이면 **미들웨어가 알아서 컨텍스트에 담고, 로그에 자동으로 붙는다.** 그냥 `logger.info(...)`만 찍으면 된다. 이 폴더를 직접 쓸 일은 아래 두 경우뿐이다.

## 경우 1: 지금 요청의 traceId를 코드에서 읽고 싶을 때

예를 들어 외부 API에 traceId를 같이 넘기고 싶다든가.

```ts
import { ExecutionContext } from 'src/common/context/executionContext';

const traceId = ExecutionContext.getTraceId(); // 없으면 undefined

await fetch('...', { headers: { 'x-trace-id': traceId } });
```

**읽기만 할 거면 `ExecutionContext.getTraceId()`** 하나면 된다.

## 경우 2: cron 등 HTTP 밖 작업을 만들 때

HTTP가 아니면 컨텍스트를 여는 미들웨어가 없다. 그래서 **작업을 `withExecutionContext`로 감싸야** 그 안의 로그들이 같은 traceId로 묶인다.

```ts
import { withExecutionContext } from 'src/common/context/executionContext';

@Cron('0 0 * * *')
async handleCleanup() {
  // {} 를 넘기면 traceId를 자동 생성해준다
  await withExecutionContext({}, async () => {
    try {
      this.logger.info('cleanup 시작');   // 여기 로그들이
      await this.doCleanup();
      this.logger.info('cleanup 완료');   // 전부 같은 traceId로 묶임
    } catch (error) {
      // cron은 필터가 없으니 여기서 직접 잡아 로깅
      this.logger.error('cleanup 실패', { labels: { job: 'cleanup' } });
    }
  });
}
```

**규칙:**
- `withExecutionContext({}, async () => { ... })` — cron은 넘길 값이 없으니 `{}`.
- **try-catch를 컨텍스트 "안"에 둬라.** 밖에서 잡으면 그 에러 로그엔 traceId가 안 붙는다.

## 정리

| 하고 싶은 것 | 이렇게 |
| --- | --- |
| HTTP에서 로그에 traceId 붙이기 | **아무것도 안 해도 됨** (자동) |
| 지금 요청의 traceId 값 읽기 | `ExecutionContext.getTraceId()` |
| cron/백그라운드 작업 묶기 | `withExecutionContext({}, async () => {...})` |

> `client.ip` 등은 HTTP 출처에만 붙는다. cron은 클라이언트가 없어서 traceId만 붙는다. (원리는 `../read.md` 참고)
