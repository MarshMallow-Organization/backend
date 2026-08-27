import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exception/businessException';
import { HoldingsErrorCode } from '../holdings.error';

/**
 * 사용자가 실제로 보유한 종목 한 건.
 *
 * 외부(토스) 응답의 필드명을 그대로 쓰지 않는다. symbol → stockCode,
 * name → stockName, averagePurchasePrice → avgBuyPrice,
 * lastPrice → currentPrice로 이 provider 안에서 흡수한다. 바깥이
 * 외부 스키마를 알면 연동처가 바뀔 때마다 도메인 코드가 따라 바뀐다.
 */
export interface Holding {
  stockCode: string;

  stockName: string;

  /** 보유 수량. */
  quantity: number;

  /**
   * 평균 매수 단가.
   *
   * 정수가 아닐 수 있다. 분할 매수분을 가중평균하면 소수가 남는다.
   * 이 값을 정수로 반올림해 두면 unrealizedProfit과 앞뒤가 맞지 않는다.
   */
  avgBuyPrice: number;

  /** 현재가. */
  currentPrice: number;

  /**
   * 아래 4개는 자산 요약(/assets/summary) 전용 필드다.
   * 토스가 계산해서 내려주는 값을 그대로 신뢰하고 이 서비스에서 재계산하지 않는다.
   */

  /** 매입금액(원화). 토스 totalPurchaseAmount.krw */
  totalPurchaseAmount: number;

  /** 평가금액(원화). 토스 marketValue.amount.krw */
  evaluationAmount: number;

  /** 평가손익(원화). 토스 profitLoss.amount.krw */
  profitAmount: number;

  /** 일간 손익(원화). 토스 dailyProfitLoss.amount.krw */
  dailyProfitAmount: number;
}

/**
 * 로컬 개발·테스트용 고정 보유 종목.
 *
 * 명세(openapi.yaml PortfolioDetail)의 예시와 같은 값이라 계산식이
 * 맞는지 응답만 보고 확인할 수 있다. 카카오는 손실·소수 단가를,
 * LG에너지솔루션은 전량 매도분을 각각 확인하려고 넣었다.
 */
const STUB_HOLDINGS: readonly Holding[] = [
  {
    stockCode: '005930',
    stockName: '삼성전자',
    quantity: 30,
    avgBuyPrice: 68000,
    currentPrice: 72500,
    totalPurchaseAmount: 2040000, // 68000 * 30
    evaluationAmount: 2175000, // 72500 * 30
    profitAmount: 135000, // (72500 - 68000) * 30
    dailyProfitAmount: 13500, // 임의값(평가손익의 10%)
  },
  {
    stockCode: '000660',
    stockName: 'SK하이닉스',
    quantity: 10,
    avgBuyPrice: 180000,
    currentPrice: 198000,
    totalPurchaseAmount: 1800000, // 180000 * 10
    evaluationAmount: 1980000, // 198000 * 10
    profitAmount: 180000, // (198000 - 180000) * 10
    dailyProfitAmount: 18000, // 임의값(평가손익의 10%)
  },
  {
    stockCode: '035720',
    stockName: '카카오',
    quantity: 5,
    avgBuyPrice: 48500.4,
    currentPrice: 41200,
    totalPurchaseAmount: 242502, // 48500.4 * 5
    evaluationAmount: 206000, // 41200 * 5
    profitAmount: -36502, // (41200 - 48500.4) * 5, 손실 케이스
    dailyProfitAmount: -3650, // 임의값(평가손익의 10%, 음수 유지)
  },
  {
    stockCode: '373220',
    stockName: 'LG에너지솔루션',
    quantity: 0,
    avgBuyPrice: 412000,
    currentPrice: 385000,
    totalPurchaseAmount: 0, // 전량 매도라 현재 보유 노출 없음
    evaluationAmount: 0,
    profitAmount: 0,
    dailyProfitAmount: 0,
  },
];

/**
 * 사용자의 실보유 종목을 돌려준다.
 *
 * VirtualPortfolioStock에는 stockCode만 저장된다. 가상계좌는 실보유
 * 종목을 묶는 폴더일 뿐이라 수량·평균단가는 DB에 없고 매번 외부에서
 * 가져와야 한다.
 *
 * GET /assets/holdings(권민수)를 HTTP로 호출하지 않는다. 같은 서버를
 * 자기 자신이 다시 부르면 인증 헤더를 재구성해야 하고 캐싱·레이트리밋을
 * 걸 지점도 사라진다. 서비스 계층을 공유해 두 경로가 같은 데이터를 본다.
 *
 * ⚠️ 지금은 stub이다. 토스 연동이 아직 없어 userId와 무관하게 같은
 * 목록을 돌려준다. 실제 구현이 들어와도 이 클래스 내부만 바뀌고
 * 호출부(PortfoliosService)는 손대지 않는다.
 *
 * 실제 토스 holdings 엔드포인트(GET /api/v1/holdings, developers.tossinvest.com
 * 문서 확인됨)는 계좌별 인증(TossAccount.apiKey/secretKey → TossClient의
 * tossCredentials), X-Tossinvest-Account 헤더, 통화별(krw/usd)로 나뉜
 * 요약 금액, 문자열로 내려오는 숫자 등 지금 이 stub보다 계약이 커서
 * 별도 작업으로 연결한다. 그 작업이 TossClient(src/domains/api/clients/toss)를
 * 확장하면 이 provider는 그 서비스를 재사용하고, 같은 서버의
 * GET /assets/holdings를 HTTP로 다시 호출하지 않는다.
 *
 * 그 전까지 이 stub이 배포 환경에서 실수로 동작하지 않도록
 * HOLDINGS_STUB_ENABLED 플래그로 막아둔다(StubAuthGuard와 같은 이유:
 * app.env는 미설정 시 'local'로 채워져 판정 기준이 될 수 없다).
 */
@Injectable()
export class HoldingsProvider {
  constructor(private readonly configService: ConfigService) {}

  async getHoldings(userId: number): Promise<Holding[]> {
    if (!this.configService.get<boolean>('holdings.stubEnabled')) {
      throw new BusinessException(HoldingsErrorCode.HOLDINGS_UNAVAILABLE, {
        userId,
      });
    }

    /**
     * stub이라 userId를 쓰지 않는다. 실제 구현에서는 이 값으로 토스
     * 계정을 찾으므로 시그니처에는 남겨 둔다.
     */
    void userId;

    return Promise.resolve([...STUB_HOLDINGS]);
  }
}
