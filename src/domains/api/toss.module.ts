import { Module } from "@nestjs/common";
import { ApiModule } from "./api.module";
import { TossApiService } from "./toss-api.service";

/**
 * @deprecated 하위 호환성을 위해 유지됩니다. ApiModule 사용을 권장합니다.
 */
@Module({
  imports: [ApiModule],
  providers: [TossApiService],
  exports: [TossApiService, ApiModule],
})
export class TossApiModule {}
