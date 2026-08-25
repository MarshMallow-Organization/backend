import { HoldingDto } from '../dto/response/holding.dto';
import { Holding } from './holdings.provider';
import { toPercent } from './money.util';

/**
 * 원본 Holding(수량·단가)에서 평가금액·평가손익·수익률을 계산해 HoldingDto로 만든다.
 *
 * Holding에는 /assets/summary 전용 필드(totalPurchaseAmount 등)도 같이 들어있는데,
 * 여기서 필요한 필드만 명시적으로 골라 담아서 그 필드들이 응답에 새지 않게 한다.
 * (`{ ...holding, ... }`로 스프레드하면 Holding에 필드가 늘어날 때마다
 * HoldingDto에 없는 필드까지 응답에 그대로 노출된다.)
 */
export function enrichHolding(holding: Holding): HoldingDto {
  const diff = holding.currentPrice - holding.avgBuyPrice;

  return {
    stockCode: holding.stockCode,
    stockName: holding.stockName,
    quantity: holding.quantity,
    avgBuyPrice: holding.avgBuyPrice,
    currentPrice: holding.currentPrice,
    evaluationAmount: Math.round(holding.currentPrice * holding.quantity),
    unrealizedProfit: Math.round(diff * holding.quantity),

    /**
     * avgBuyPrice가 0이면 수익률을 정의할 수 없다. 무상증자로 받은
     * 주식이 0원으로 들어오면 실제로 생긴다. 0으로 두면 Infinity가
     * JSON에 null로 나가 프론트가 깨진다.
     */
    returnRate:
      holding.avgBuyPrice > 0 ? toPercent(diff / holding.avgBuyPrice) : 0,
  };
}
