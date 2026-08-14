import { Module } from '@nestjs/common';
import { TossApiModule } from 'src/domains/api/toss.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HiddenStockController } from './controllers/hidden-stock.controller';
import { HiddenStockService } from './services/hidden-stock.service';

@Module({
  imports: [PrismaModule, TossApiModule],
  controllers: [HiddenStockController],
  providers: [HiddenStockService],
})
export class UsersModule {}
