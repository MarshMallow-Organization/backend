import { Module } from '@nestjs/common';
import { HiddenStockController } from './hidden-stock.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HiddenStockService } from './hidden-stock.service';
import { TossApiModule } from 'src/toss/toss.module';

@Module({
  imports: [PrismaModule, TossApiModule], // 토스 모듈 주입
  controllers: [HiddenStockController], // 이 모듈에서 사용하는 Controller 등록
  providers: [HiddenStockService], // NestJS가 생성하고 관리할 Service 등록
})
export class HiddenStockModule {}
