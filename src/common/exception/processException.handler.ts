import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CustomLogger } from '../logger/customLogger';

/**
 * HTTP 요청 흐름 밖에서 발생해 아무도 잡지 않은 에러의 최종 방어선.
 *
 * 예외 필터는 요청 파이프라인 안에서만 동작하므로, cron·이벤트·타이머 등
 * 요청 밖에서 새어나온 에러는 여기(프로세스 레벨)에서만 잡을 수 있다.
 *
 * onApplicationBootstrap에서 등록하므로, 이 시점 이후의 런타임을 담당한다.
 * 부팅 초기(핸들러 등록 전) 구간은 main.ts의 bootstrap().catch()가 맡는다.
 */
@Injectable()
export class ProcessExceptionHandler implements OnApplicationBootstrap {
  private readonly logger = new CustomLogger(ProcessExceptionHandler.name);

  onApplicationBootstrap(): void {
    /**
     * 동기 흐름 중간에서 스택이 풀린 것이라 프로세스 상태를 신뢰할 수 없다.
     * 깨진 상태로 계속 도는 것(조용한 데이터 오염)이 크래시보다 위험하므로,
     * 로그를 남긴 뒤 종료해 오케스트레이터가 새 프로세스를 띄우게 한다.
     */
    process.on('uncaughtException', (error) => {
      this.logger.error('uncaughtException', {
        error: {
          type: error.name,
          message: error.message,
          stack_trace: error.stack,
        },
      });

      process.exit(1);
    });

    /**
     * reject된 Promise를 아무도 처리하지 않은 경우.
     * 보통 async 작업 하나가 실패한 것이라 프로세스 상태가 깨진 건 아니므로,
     * 로그만 남기고 계속 실행한다.
     */
    process.on('unhandledRejection', (reason) => {
      this.logger.error('unhandledRejection', {
        error: {
          /** reject 값은 Error가 아닐 수 있어 방어적으로 다룬다. */
          type: reason instanceof Error ? reason.name : typeof reason,
          message: reason instanceof Error ? reason.message : String(reason),
          ...(reason instanceof Error && { stack_trace: reason.stack }),
        },
      });
    });
  }
}
