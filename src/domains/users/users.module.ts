import { Module } from '@nestjs/common';
import { ApiModule } from 'src/domains/api/api.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FavoriteStocksController } from './controllers/favorite-stocks.controller';
import { HiddenStockController } from './controllers/hidden-stock.controller';
import { FavoriteStocksService } from './services/favorite-stocks.service';
import { HiddenStockService } from './services/hidden-stock.service';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  /** PrismaModule은 @Global이 아니라서 도메인마다 직접 import해야 한다. */
  imports: [PrismaModule, ApiModule],
  controllers: [
    FavoriteStocksController,
    HiddenStockController,
    UsersController,
  ],
  providers: [FavoriteStocksService, HiddenStockService, UsersService],
})
export class UsersModule {}
