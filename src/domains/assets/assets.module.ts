import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  /** PrismaModule은 @Global이 아니라서 도메인마다 직접 import해야 한다. */
  imports: [PrismaModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
