import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomConfigModule } from './config/config.module';
import { HttpLoggingMiddleware } from './common/logger/httpLogging.middleware';
import { PrismaModule } from './prisma/prisma.module';

// 운영 환경에서 뺄것 분기처리 하기
const imports = [
  /** 전역 변수 설정 모듈 */
  CustomConfigModule,
  /** Prisma ORM 모듈 */
  PrismaModule,
];

@Module({
  imports: [...imports],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    /** 매칭되지 않는 요청(404)까지 포함해 모든 HTTP 요청을 로깅한다. */
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
  }
}
