import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestStore = {
  /** 요청 단위 추적 ID. ECS의 trace.id로 나간다. */
  traceId: string;
};

const storage = new AsyncLocalStorage<RequestStore>();

/**
 * 요청 단위 컨텍스트 저장소.
 *
 * 미들웨어가 요청 처리 전체를 run()으로 감싸면,
 * 하위 서비스/리포지토리에서 인자 전달 없이 traceId를 읽을 수 있다.
 *
 * 주의: AsyncLocalStorage 컨텍스트는 요청이 중단(abort)된 경우
 * response의 'close' 리스너까지 전파되지 않는다. 소켓이 컨텍스트 밖에서
 * 이벤트를 발생시키기 때문이다. 따라서 미들웨어의 요청 완료 로그는
 * 이 저장소가 아니라 클로저에 담긴 값을 직접 사용해야 한다.
 */
export const RequestContext = {
  run<T>(store: RequestStore, callback: () => T): T {
    return storage.run(store, callback);
  },

  get(): RequestStore | undefined {
    return storage.getStore();
  },

  getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
  },
};
