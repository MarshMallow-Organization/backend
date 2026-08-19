import { Module } from '@nestjs/common';
import { TossApiModule } from 'src/domains/api/toss.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MarketsController } from './controllers/markets.controller';
import { MarketsService } from './services/markets.service';

@Module({
  imports: [PrismaModule, TossApiModule],
  controllers: [MarketsController],
  providers: [MarketsService],
})
export class MarketsModule {}
