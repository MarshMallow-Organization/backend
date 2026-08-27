import { Module } from '@nestjs/common';
import { EncryptionModule } from 'src/common/encryption/encryption.module';
import { ApiModule } from 'src/domains/api/api.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FavoriteStocksController } from './controllers/favorite-stocks.controller';
import { HiddenStockController } from './controllers/hidden-stock.controller';
import { TossAccountController } from './controllers/toss-account.controller';
import { FavoriteStocksService } from './services/favorite-stocks.service';
import { HiddenStockService } from './services/hidden-stock.service';
import { TossAccountService } from './services/toss-account.service';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  /** PrismaModule은 @Global이 아니라서 도메인마다 직접 import해야 한다. */
  imports: [PrismaModule, ApiModule, EncryptionModule],
  controllers: [
    FavoriteStocksController,
    HiddenStockController,
    TossAccountController,
    UsersController,
  ],
  providers: [
    FavoriteStocksService,
    HiddenStockService,
    TossAccountService,
    UsersService,
  ],
})
export class UsersModule {}
