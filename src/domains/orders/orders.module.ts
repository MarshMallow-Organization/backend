import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { OrdersRepository } from './services/orders.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApiModule } from 'src/domains/api/api.module';

@Module({
  imports: [PrismaModule, ApiModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
