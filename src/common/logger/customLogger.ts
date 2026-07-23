import { Logger } from '@nestjs/common';

/**
 * ECS labels로 나가는 임의 key/value.
 *
 * 개발자가 자유롭게 채우는 자리지만, 중첩을 허용하면 Elasticsearch 매핑이
 * 폭발하므로 평평한 스칼라만 받는다. (ES에서 labels를 flattened로 매핑하면
 * 이 제약 없이 열 수도 있으나, 기본은 안전하게 스칼라로 둔다.)
 */
export type LogLabels = Record<string, string | number | boolean | null>;

/**
 * 우리 서비스의 로그 스키마.
 *
 * message는 필수라 별도 인자로 받고, level은 호출한 메서드가 정하며,
 * log.logger는 로거 인스턴스 이름에서 자동으로 채워진다.
 * 따라서 이 스키마엔 message·level·logger를 넣지 않는다.
 */
export interface OurLoggingSchema {
  /** 개발자가 자유롭게 채우는 추가 정보. ECS labels로 나간다. */
  labels?: LogLabels;

  /** 이하 예약 ECS 필드 — 플랫폼(필터·미들웨어·핸들러)이 채운다. */
  error?: {
    type: string;
    code?: string;
    message: string;
    stack_trace?: string;
  };

  event?: {
    action: string;
    outcome?: 'success' | 'failure' | 'unknown';
    duration?: number;
  };
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * NestJS 기본 Logger를 감싼 우리 로거.
 *
 * 개발자는 message + 자유 labels만 쓰고, 예약 ECS 필드는 스키마 타입으로
 * 강제된다. 내부적으로 NestJS Logger에 위임하므로 app.useLogger로 교체된
 * winston(ECS 포맷·trace.id 주입)을 그대로 탄다.
 *
 * 인스턴스 이름이 ecsLogFormat을 통해 log.logger로 나가므로,
 * 사용처마다 new CustomLogger(MyService.name)으로 생성한다.
 */
export class CustomLogger {
  private readonly logger: Logger;

  constructor(name: string) {
    this.logger = new Logger(name);
  }

  debug(message: string, log?: OurLoggingSchema): void {
    this.write('debug', message, log);
  }

  info(message: string, log?: OurLoggingSchema): void {
    this.write('info', message, log);
  }

  warn(message: string, log?: OurLoggingSchema): void {
    this.write('warn', message, log);
  }

  error(message: string, log?: OurLoggingSchema): void {
    this.write('error', message, log);
  }

  /** 모든 public 메서드가 통과하는 유일한 실제 로깅 지점. */
  private write(
    level: LogLevel,
    message: string,
    log?: OurLoggingSchema,
  ): void {
    /** 인스턴스 이름(context)은 ecsLogFormat이 log.logger로 옮긴다. */
    this.logger.log({ level, message, ...log });
  }
}
