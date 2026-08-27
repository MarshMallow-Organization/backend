import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MarketsController } from './controllers/markets.controller';
import { MarketsService } from './services/markets.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketsController],
  providers: [MarketsService],
})
export class MarketsModule {}
