import { Module } from '@nestjs/common';
import { TossApiService } from './toss-api.service';

@Module({
  providers: [TossApiService], // NestJS가 생성하고 관리할 Service 등록
  exports: [TossApiService], // 외부 api를 다른 모듈에서 쓰기위해 exports 추가
})
export class TossApiModule {}
