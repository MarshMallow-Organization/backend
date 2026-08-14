import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PortfoliosController } from './controllers/portfolios.controller';
import { PortfoliosService } from './services/portfolios.service';

@Module({
  /** PrismaModule은 @Global이 아니라서 도메인마다 직접 import해야 한다. */
  imports: [PrismaModule],
  controllers: [PortfoliosController],
  providers: [PortfoliosService],
})
export class AssetsModule {}
