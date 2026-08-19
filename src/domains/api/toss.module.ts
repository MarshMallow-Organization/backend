import { Module } from '@nestjs/common';
import { TossApiService } from './toss-api.service';

@Module({
  providers: [TossApiService],
  exports: [TossApiService],
})
export class TossApiModule {}
