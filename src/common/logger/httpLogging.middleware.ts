// src/winston/middleware/http-logging.middleware.ts

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContext } from '../context/requestContext';

type HttpLogLevel = 'info' | 'warn' | 'error';

type EventOutcome = 'success' | 'failure' | 'unknown';

type RequestWithId = Request & {
  requestId?: string;
};

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  /**
   * winston 포맷(ecsLogFormat)이 info.context를 log.logger로 옮기므로
   * 로거 이름은 context로 전달해야 한다.
   */
  private readonly logger = new Logger(HttpLoggingMiddleware.name);

  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    const requestId = this.getRequestId(request);

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    /**
     * finish는 응답이 정상적으로 전송된 경우에만 발생한다.
     * 클라이언트 연결 중단/타임아웃 시 로그가 유실되므로,
     * 정상·비정상 종료 모두에서 발생하는 close를 사용한다.
     */
    response.once('close', () => {
      const duration = Number(process.hrtime.bigint() - startedAt);

      const statusCode = response.statusCode;
      const level = this.getLogLevel(statusCode);

      /** 응답을 끝까지 쓰지 못했다면 중단된 요청이다. */
      const isAborted = !response.writableEnded;

      this.logger.log({
        level,
        message: isAborted ? 'HTTP request aborted' : 'HTTP request completed',

        event: {
          action: 'http.request',
          outcome: this.getOutcome(statusCode, isAborted),
          duration,
        },

        http: {
          request: {
            id: requestId,
            method: request.method,
          },
          response: {
            status_code: statusCode,
          },
          version: request.httpVersion,
        },

        url: {
          /**
           * path는 미들웨어가 마운트된 경로만큼 잘려나가므로
           * 마운트 위치와 무관하게 전체 경로를 담는 originalUrl을 사용한다.
           * 쿼리스트링은 민감 정보가 섞일 수 있어 제외한다.
           */
          path: request.originalUrl.split('?')[0],
        },

        client: {
          ip: request.ip,
        },

        user_agent: {
          original: request.get('user-agent'),
        },

        /**
         * 중단된 요청에서는 이 콜백에 AsyncLocalStorage 컨텍스트가
         * 전파되지 않으므로, 저장소가 아닌 클로저 값을 직접 사용한다.
         */
        trace: {
          id: requestId,
        },

        /** user는 인증 모듈 도입 후 추가한다. */
      });
    });

    /** 이후 모든 하위 로직이 동일한 traceId를 공유하도록 컨텍스트를 연다. */
    RequestContext.run({ traceId: requestId }, () => next());
  }

  private getRequestId(request: Request): string {
    const receivedRequestId = request.get('x-request-id')?.trim();

    if (receivedRequestId && receivedRequestId.length <= 128) {
      return receivedRequestId;
    }

    return randomUUID();
  }

  /**
   * 중단된 요청은 상태 코드가 실제 처리 결과를 반영하지 않으므로
   * success/failure로 단정하지 않고 unknown으로 둔다.
   */
  private getOutcome(statusCode: number, isAborted: boolean): EventOutcome {
    if (isAborted) {
      return 'unknown';
    }

    return statusCode >= 400 ? 'failure' : 'success';
  }

  private getLogLevel(statusCode: number): HttpLogLevel {
    if (statusCode >= 500) {
      return 'error';
    }

    if (statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  }
}
