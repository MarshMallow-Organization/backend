import { HiddenStockModule } from './hidden-stock/hidden-stock.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/exception/allException.filter';
import { BusinessExceptionFilter } from './common/exception/businessException.filter';
import { PrismaExceptionFilter } from './common/exception/prismaException.filter';
import { ProcessExceptionHandler } from './common/exception/processException.handler';
import { CustomConfigModule } from './config/config.module';
import { HttpLoggingMiddleware } from './common/logger/httpLogging.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { ResponseInterceptor } from './global/interceptor/response.interceptor';
import { AuthModule } from './domains/auth/auth.module';
import { AssetsModule } from './domains/assets/assets.module';

// 운영 환경에서 뺄것 분기처리 하기
const imports = [
  /** 전역 변수 설정 모듈 */
  CustomConfigModule,
  /** Prisma ORM 모듈 */
  PrismaModule,
  /**Auth 인증 모듈 */
  AuthModule,
  /** 자산(가상계좌) 모듈 */
  AssetsModule,
  /** Hidden-stock 모듈 */
  HiddenStockModule,
];

@Module({
  imports,
  controllers: [AppController],
  providers: [
    AppService,
    /** HTTP 밖(cron·타이머 등)에서 새어나온 에러의 프로세스 레벨 방어선. */
    ProcessExceptionHandler,
    /**
     * 전역 예외 필터. NestJS는 등록의 역순으로 매칭하므로,
     * 아래로 갈수록(나중에 등록될수록) 우선순위가 높다.
     * 따라서 catch-all 폴백을 맨 위에, 전용 필터를 아래에 둔다.
     */
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: BusinessExceptionFilter },
    /** 모든 정상 응답을 { data: T } 형식으로 통일한다. */
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    /** 매칭되지 않는 요청(404)까지 포함해 모든 HTTP 요청을 로깅한다. */
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
  }
}
