import { Module } from '@nestjs/common';
import { TossApiModule } from 'src/domains/api/toss.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GetStockController } from './controller/get-stock.controller';
import { GetStockService } from './services/get-stock.service';

@Module({
  imports: [PrismaModule, TossApiModule],
  controllers: [GetStockController],
  providers: [GetStockService],
})
export class MarketsModule {}
