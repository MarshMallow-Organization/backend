import { Module } from '@nestjs/common';
import { TossClient } from './clients/toss/toss.client';
import { OrdersApiService } from './orders-api/orders-api.service';

@Module({
  providers: [TossClient, OrdersApiService],
  exports: [TossClient, OrdersApiService],
})
export class ApiModule {}
