import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AssetsController } from './controllers/assets.controller';
import { PortfoliosController } from './controllers/portfolios.controller';
import { AssetSummaryService } from './services/asset-summary.service';
import { HoldingsProvider } from './services/holdings.provider';
import { PortfoliosService } from './services/portfolios.service';

@Module({
  /** PrismaModule은 @Global이 아니라서 도메인마다 직접 import해야 한다. */
  imports: [PrismaModule],
  controllers: [PortfoliosController, AssetsController],
  providers: [PortfoliosService, AssetSummaryService, HoldingsProvider],

  /**
   * HoldingsProvider만 내보낸다.
   *
   * 실보유 수량·평균단가가 필요한 곳이 가상계좌 말고도 있다. 일기
   * 자동 채우기(#68)가 SELL 타입의 매수단가로 보유 종목의 평균단가를
   * 쓰기로 했고, /assets/summary·/assets/holdings도 같은 데이터를 본다.
   * 각자 토스를 부르면 캐싱·레이트리밋을 걸 지점이 흩어진다.
   *
   * PortfoliosService는 내보내지 않는다. 계좌 CRUD는 HTTP 밖에서
   * 부를 일이 없다.
   */
  exports: [HoldingsProvider],
})
export class AssetsModule {}
