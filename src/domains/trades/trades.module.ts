import { Module } from '@nestjs/common';
import { TradesController } from './controllers/trades.controller';
import { TradesService } from './services/trades.service';
import { TradesRepository } from './services/trades.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TradesController],
  providers: [TradesService, TradesRepository],
  exports: [TradesService],
})
export class TradesModule {}
