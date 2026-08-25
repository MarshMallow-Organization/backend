import { Module } from '@nestjs/common';
import { TossClient } from './clients/toss/toss.client';
import { KisClient } from './clients/kis/kis.client';
import { OrdersApiService } from './orders-api/services/orders-api.service';
import { OrdersWatcherService } from './orders-api/services/orders-watcher.service';

@Module({
  providers: [TossClient, KisClient, OrdersApiService, OrdersWatcherService],
  exports: [TossClient, KisClient, OrdersApiService, OrdersWatcherService],
})
export class ApiModule {}
