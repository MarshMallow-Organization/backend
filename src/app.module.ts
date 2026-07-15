import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomConfigModule } from './config/config.module';
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
export class AppModule {}
