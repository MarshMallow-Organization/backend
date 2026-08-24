import { Module } from '@nestjs/common';
import { TossClient } from './clients/toss/toss.client';
import { KisClient } from './clients/kis/kis.client';
import { OrdersApiService } from './orders-api/orders-api.service';
import { MarketsApiService } from './markets-api/markets-api.service';

@Module({
  providers: [TossClient, KisClient, OrdersApiService, MarketsApiService],
  exports: [TossClient, KisClient, OrdersApiService, MarketsApiService],
})
export class ApiModule {}
