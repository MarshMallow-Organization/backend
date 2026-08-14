import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FavoriteStocksController } from './controllers/favorite-stocks.controller';
import { FavoriteStocksService } from './services/favorite-stocks.service';

@Module({
  /** PrismaModule은 @Global이 아니라서 도메인마다 직접 import해야 한다. */
  imports: [PrismaModule],
  controllers: [FavoriteStocksController],
  providers: [FavoriteStocksService],
})
export class UsersModule {}
