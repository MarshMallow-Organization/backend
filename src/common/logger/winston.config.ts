import { ConfigService } from '@nestjs/config';
import { utilities } from 'nest-winston';
import { format, LoggerOptions, transports } from 'winston';
import { ExecutionContext } from '../context/executionContext';

export const winstonConfigCreator = (configService: ConfigService) => {
  const env = configService.get<string>('app.env') ?? 'local';

  const isLocal = env === 'local' ? true : false;
  const appName =
    configService.get<string>('app.name') ?? 'marshmallow-api-server';
  const appVersion = configService.get<string>('app.version') ?? '1.0.0';

  /**
   * winston 기본 필드(level, timestamp, context)를 ECS 스키마로 옮긴다.
   *
   * nestLike 포맷이 level/timestamp/context를 직접 사용하므로
   * 이 포맷은 production(JSON) 체인에만 적용해야 한다.
   * commonFormats에 넣으면 local 출력에서 level.toUpperCase()가 터진다.
   */
  const ecsLogFormat = format((info) => {
    const loggerName =
      typeof info.context === 'string' ? info.context : undefined;

    info.log = {
      level: info.level,
      ...(loggerName && { logger: loggerName }),
    };

    info['@timestamp'] = info.timestamp;

    /** ECS 스키마에 없는 winston 원본 필드는 제거한다. */
    delete info.context;
    delete info.timestamp;
    delete (info as { level?: unknown }).level;

    return info;
  });

  /**
   * 요청 컨텍스트가 있으면 trace.id를 자동으로 채운다.
   * 덕분에 서비스·리포지토리 계층 로그도 요청 단위로 묶인다.
   *
   * 호출부가 trace를 직접 넣은 경우(HTTP 미들웨어의 요청 완료 로그)는
   * 덮어쓰지 않는다. 중단된 요청에서는 컨텍스트가 전파되지 않아
   * 호출부 값이 유일하게 신뢰할 수 있는 값이기 때문이다.
   */
  const executionContextFormat = format((info) => {
    const store = ExecutionContext.get();

    if (!store) {
      return info;
    }

    /**
     * 호출부가 직접 넣은 값은 덮어쓰지 않는다. 중단된 요청에서는 컨텍스트가
     * 전파되지 않아, 미들웨어 완료 로그가 클로저로 직접 넣은 값이 유일하게
     * 신뢰할 수 있기 때문이다.
     *
     * client/user_agent는 HTTP 출처에서만 컨텍스트에 담기므로, cron 등
     * 다른 출처의 로그에는 자동으로 붙지 않는다.
     */
    if (!info.trace && store.traceId) {
      info.trace = { id: store.traceId };
    }

    if (!info.client && store.client) {
      info.client = store.client;
    }

    if (!info.user_agent && store.user_agent) {
      info.user_agent = store.user_agent;
    }

    return info;
  });

  const commonFormats = [
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    executionContextFormat(),
  ];

  const localFormat = [
    utilities.format.nestLike(appName, {
      colors: true,
      prettyPrint: true,
      processId: true,
      appName: true,
    }),
  ];

  const productionFormat = [ecsLogFormat(), format.json()];

  const config: LoggerOptions = {
    /** local일때만 debug 로그 포함함. */
    level: isLocal ? 'debug' : 'info',
    format: format.combine(...commonFormats),
    /** 로컬 개발에서는 필요가 없으므로 가림 */
    defaultMeta: !isLocal
      ? {
          service: {
            name: appName,
            environment: env,
            type: 'nestjs',
            version: appVersion,
          },
        }
      : {},

    transports: [
      new transports.Console({
        format: isLocal
          ? format.combine(...localFormat)
          : format.combine(...productionFormat),
      }),
    ],
  };

  return config;
};
