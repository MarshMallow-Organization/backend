import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENCRYPTION_ADAPTER } from 'src/common/encryption/encryption.adapter';
import type { EncryptionAdapter } from 'src/common/encryption/encryption.adapter';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from 'src/domains/api/clients/toss/toss.client';
import { TossErrorCode } from 'src/domains/api/clients/toss/toss.error';
import type { TossCredentials } from 'src/domains/api/clients/toss/toss.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { HoldingsErrorCode } from '../holdings.error';
import {
  TossAccountsResponse,
  TossExchangeRateResponse,
  TossHoldingItemRaw,
  TossHoldingsResponse,
} from './toss-holdings.types';

/**
 * 사용자가 실제로 보유한 종목 한 건.
 *
 * 외부(토스) 응답의 필드명을 그대로 쓰지 않는다. symbol → stockCode,
 * name → stockName, averagePurchasePrice → avgBuyPrice,
 * lastPrice → currentPrice로 이 provider 안에서 흡수한다. 바깥이
 * 외부 스키마를 알면 연동처가 바뀔 때마다 도메인 코드가 따라 바뀐다.
 *
 * 통화도 여기서 흡수한다. 토스는 국내(KRW)·해외(USD) 종목을 통화별로
 * 따로 내려주지만, 이 인터페이스의 금액은 전부 원화로 환산된 값이다.
 * 소비자(enrichHolding, AssetSummaryService 등)는 통화를 신경 쓰지 않는다.
 */
export interface Holding {
  stockCode: string;

  stockName: string;

  /** 보유 수량. */
  quantity: number;

  /**
   * 평균 매수 단가(원화 환산).
   *
   * 정수가 아닐 수 있다. 분할 매수분을 가중평균하면 소수가 남는다.
   * 이 값을 정수로 반올림해 두면 unrealizedProfit과 앞뒤가 맞지 않는다.
   */
  avgBuyPrice: number;

  /** 현재가(원화 환산). */
  currentPrice: number;

  /**
   * 아래 4개는 자산 요약(/assets/summary) 전용 필드다.
   * 토스가 계산해서 내려주는 값을 원화로 환산만 하고 이 서비스에서
   * 다시 계산하지 않는다.
   */

  /** 매입금액(원화). 토스 marketValue.purchaseAmount */
  totalPurchaseAmount: number;

  /** 평가금액(원화). 토스 marketValue.amount */
  evaluationAmount: number;

  /** 평가손익(원화). 토스 profitLoss.amount */
  profitAmount: number;

  /** 일간 손익(원화). 토스 dailyProfitLoss.amount */
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
 * HOLDINGS_STUB_ENABLED가 켜져 있으면(로컬 개발·e2e 테스트) 고정된
 * STUB_HOLDINGS를 돌려주고, 꺼져 있으면 실제 토스 API를 3단계로
 * 호출한다:
 *   1. GET /api/v1/accounts        → accountSeq 확보
 *   2. GET /api/v1/holdings        → 종목별 보유 현황(원본 통화)
 *   3. GET /api/v1/exchange-rate   → USD 종목이 있을 때만, 원화 환산용
 */
@Injectable()
export class HoldingsProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tossClient: TossClient,
    @Inject(ENCRYPTION_ADAPTER)
    private readonly encryptionAdapter: EncryptionAdapter,
  ) {}

  async getHoldings(userId: number): Promise<Holding[]> {
    if (this.configService.get<boolean>('holdings.stubEnabled')) {
      return [...STUB_HOLDINGS];
    }

    const credentials = await this.getCredentials(userId);
    const accountSeq = await this.getAccountSeq(credentials);
    const items = await this.fetchHoldingItems(credentials, accountSeq);
    const usdToKrwRate = await this.getUsdToKrwRateIfNeeded(credentials, items);

    return items.map((item) => toHolding(item, usdToKrwRate));
  }

  /**
   * userId로 저장된 토스 apiKey/secretKey를 조회하고 secretKey를 복호화한다.
   *
   * TossAccount가 없으면(아직 연동 안 함) TossErrorCode.ACCOUNT_NOT_CONNECTED를
   * 그대로 재사용해 던진다 — 자격 증명이 없다는 사실 자체는 이 provider만의
   * 문제가 아니라 TossClient가 이미 다루는 개념이라 새로 만들지 않는다.
   */
  private async getCredentials(userId: number): Promise<TossCredentials> {
    const account = await this.prisma.tossAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new BusinessException(TossErrorCode.ACCOUNT_NOT_CONNECTED);
    }

    const clientSecret = await this.encryptionAdapter.decrypt(
      account.secretKey,
    );

    return { clientKey: account.apiKey, clientSecret };
  }

  /**
   * 계좌 목록을 조회해 holdings 호출에 쓸 accountSeq를 얻는다.
   *
   * 한 사용자가 여러 계좌를 연동했을 수 있지만, 지금은 "총자산" 하나만
   * 필요해서 첫 번째(종합매매) 계좌만 쓴다. 여러 계좌를 합산해야 하면
   * 이 메서드를 계좌 배열을 돌려주도록 넓히면 된다.
   */
  private async getAccountSeq(credentials: TossCredentials): Promise<number> {
    const response = await this.tossClient.request<TossAccountsResponse>(
      '/accounts',
      { method: 'GET', tossCredentials: credentials },
    );

    const [account] = response.result;
    if (!account) {
      throw new BusinessException(HoldingsErrorCode.NO_BROKERAGE_ACCOUNT);
    }

    return account.accountSeq;
  }

  private async fetchHoldingItems(
    credentials: TossCredentials,
    accountSeq: number,
  ): Promise<TossHoldingItemRaw[]> {
    const response = await this.tossClient.request<TossHoldingsResponse>(
      '/holdings',
      {
        method: 'GET',
        headers: { 'X-Tossinvest-Account': String(accountSeq) },
        tossCredentials: credentials,
      },
    );

    return response.result.items;
  }

  /**
   * 보유 종목에 미국(USD) 종목이 하나라도 있을 때만 환율을 조회한다.
   * 국내 종목만 있으면 불필요한 API 호출을 하지 않는다.
   */
  private async getUsdToKrwRateIfNeeded(
    credentials: TossCredentials,
    items: TossHoldingItemRaw[],
  ): Promise<number | null> {
    if (!items.some((item) => item.currency === 'USD')) {
      return null;
    }

    const response = await this.tossClient.request<TossExchangeRateResponse>(
      '/exchange-rate?baseCurrency=USD&quoteCurrency=KRW',
      { method: 'GET', tossCredentials: credentials },
    );

    return Number(response.result.rate);
  }
}

/**
 * 원본 통화 그대로 오는 토스 필드를 전부 원화로 환산해 Holding으로 만든다.
 *
 * usdToKrwRate가 null인 건 "USD 종목이 하나도 없다"는 뜻이라 KRW 종목엔
 * 영향 없다. USD 종목인데 rate가 null인 상황은 getUsdToKrwRateIfNeeded가
 * 먼저 걸러주므로 이 함수 시점엔 일어나지 않는다.
 */
function toHolding(
  item: TossHoldingItemRaw,
  usdToKrwRate: number | null,
): Holding {
  const rate = item.currency === 'USD' ? mustGetRate(usdToKrwRate) : 1;
  const toKrw = (value: string) => Math.round(Number(value) * rate);

  return {
    stockCode: item.symbol,
    stockName: item.name,
    quantity: Number(item.quantity),
    avgBuyPrice: Number(item.averagePurchasePrice) * rate,
    currentPrice: Number(item.lastPrice) * rate,
    totalPurchaseAmount: toKrw(item.marketValue.purchaseAmount),
    evaluationAmount: toKrw(item.marketValue.amount),
    profitAmount: toKrw(item.profitLoss.amount),
    dailyProfitAmount: toKrw(item.dailyProfitLoss.amount),
  };
}

function mustGetRate(rate: number | null): number {
  if (rate === null) {
    throw new Error('USD 종목이 있는데 환율을 조회하지 못했습니다.');
  }
  return rate;
}
