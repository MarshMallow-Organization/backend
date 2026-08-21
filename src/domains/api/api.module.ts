import { Module } from '@nestjs/common';
import { TossClient } from './clients/toss/toss.client';

@Module({
  providers: [TossClient],
  exports: [TossClient],
})
export class ApiModule {}
