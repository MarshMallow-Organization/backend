import { Module } from '@nestjs/common';
import { ApiModule } from 'src/domains/api/api.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MarketsController } from './controllers/markets.controller';
import { MarketsService } from './services/markets.service';

@Module({
  imports: [PrismaModule, ApiModule],
  controllers: [MarketsController],
  providers: [MarketsService],
})
export class MarketsModule {}
