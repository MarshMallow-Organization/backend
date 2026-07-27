import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * 하나의 실행(HTTP 요청·cron 실행 등)을 따라다니는 컨텍스트.
 *
 * traceId는 모든 출처 공통이고, client/user_agent처럼 출처에 특화된 값은
 * 해당 출처의 경계(HTTP 미들웨어 등)에서만 채워진다. cron처럼 클라이언트가
 * 없는 출처에는 담기지 않는다.
 */
export type ExecutionStore = {
  /** 실행 단위 추적 ID. ECS의 trace.id로 나가며, 한 실행의 모든 로그를 묶는다. */
  traceId: string;

  /** HTTP 출처의 귀속 정보. cron 등에는 담기지 않는다. */
  client?: { ip?: string };
  user_agent?: { original?: string };
};

const storage = new AsyncLocalStorage<ExecutionStore>();

/**
 * 실행 단위 컨텍스트 저장소.
 *
 * 경계(미들웨어·cron 래퍼)가 실행 전체를 run()으로 감싸면,
 * 하위 서비스/리포지토리에서 인자 전달 없이 traceId 등을 읽을 수 있다.
 *
 * 주의: AsyncLocalStorage 컨텍스트는 요청이 중단(abort)된 경우
 * response의 'close' 리스너까지 전파되지 않는다. 소켓이 컨텍스트 밖에서
 * 이벤트를 발생시키기 때문이다. 따라서 미들웨어의 요청 완료 로그는
 * 이 저장소가 아니라 클로저에 담긴 값을 직접 사용해야 한다.
 */
export const ExecutionContext = {
  run<T>(store: ExecutionStore, callback: () => T): T {
    return storage.run(store, callback);
  },

  get(): ExecutionStore | undefined {
    return storage.getStore();
  },

  getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
  },
};

/**
 * 실행 컨텍스트를 여는 공통 진입 헬퍼.
 *
 * traceId 생성 로직을 이 한 곳에 모아, 각 출처(HTTP 미들웨어·cron 래퍼 등)는
 * 자기 출처에 특화된 값만 넘기면 된다. 상위(게이트웨이 등)가 이미 부여한
 * traceId가 있으면 그대로 넘겨 전파하고, 없으면 여기서 새로 생성한다.
 *
 * @example
 * // HTTP 미들웨어 — client는 이 출처만의 값, traceId는 x-request-id를 전파
 * withExecutionContext({ traceId: requestId, client: { ip } }, () => next());
 *
 * // cron 래퍼 — 넘길 특화 값이 없으면 traceId만 자동 생성된다
 * withExecutionContext({}, () => job());
 */
export function withExecutionContext<T>(
  store: Partial<ExecutionStore>,
  callback: () => T,
): T {
  const traceId = store.traceId ?? randomUUID();
  return ExecutionContext.run({ ...store, traceId }, callback);
}
