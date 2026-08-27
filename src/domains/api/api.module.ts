import { Module } from '@nestjs/common';
import { TossClient } from './clients/toss/toss.client';
import { KisClient } from './clients/kis/kis.client';
import { OrdersApiService } from './orders-api/orders-api.service';

@Module({
  providers: [TossClient, KisClient, OrdersApiService],
  exports: [TossClient, KisClient, OrdersApiService],
})
export class ApiModule {}
