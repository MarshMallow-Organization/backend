import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TossClient } from '../clients/toss/toss.client';
import type {
  TossListedStockResponse,
  TossStockResponse,
} from '../clients/toss/toss.types';
import { MarketsApiService } from './markets-api.service';

describe('MarketsApiService', () => {
  const request =
    jest.fn<
      (
        endpoint: string,
        options?: RequestInit,
      ) => Promise<TossStockResponse | TossListedStockResponse>
    >();

  let service: MarketsApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketsApiService({ request } as unknown as TossClient);
  });

  it('종목 코드를 인코딩하여 토스 종목 조회 API를 호출한다', async () => {
    const stock = {
      symbol: 'AAPL',
      name: '애플',
      englishName: 'APPLE INC',
      isinCode: 'US0378331005',
      market: 'NASDAQ',
      securityType: 'STOCK',
      isCommonShare: true,
      status: 'ACTIVE',
      currency: 'USD',
      listDate: '1980-12-12',
      delistDate: null,
      sharesOutstanding: '15000000000',
      leverageFactor: null,
      koreanMarketDetail: null,
    };
    request.mockResolvedValue({ result: [stock] });

    await expect(service.getStock('AAPL')).resolves.toEqual(stock);
    expect(request).toHaveBeenCalledWith('/stocks?symbols=AAPL', {
      method: 'GET',
    });
  });

  it('토스 응답에 종목이 없으면 null을 반환한다', async () => {
    request.mockResolvedValue({ result: [] });

    await expect(service.getStock('UNKNOWN')).resolves.toBeNull();
  });

  it('NXT 거래정지 정보가 생략되면 null로 정규화한다', async () => {
    request.mockResolvedValue({
      result: [
        {
          symbol: '005930',
          name: '삼성전자',
          englishName: 'SamsungElec',
          isinCode: 'KR7005930003',
          market: 'KOSPI',
          securityType: 'STOCK',
          isCommonShare: true,
          status: 'ACTIVE',
          currency: 'KRW',
          listDate: '1975-06-11',
          delistDate: null,
          sharesOutstanding: '5919637922',
          leverageFactor: null,
          koreanMarketDetail: {
            liquidationTrading: false,
            nxtSupported: false,
            krxTradingSuspended: false,
          },
        },
      ],
    });

    const result = await service.getStock('005930');

    expect(result?.koreanMarketDetail?.nxtTradingSuspended).toBeNull();
  });

  it('시장별 전체 종목을 조회하고 내부 DTO 형식으로 변환한다', async () => {
    request.mockResolvedValue({
      result: [
        {
          symbol: '005930',
          name: '삼성전자',
          securityType: 'STOCK',
          isCommonShare: true,
          isinCode: 'KR7005930003',
        },
      ],
    });

    await expect(service.getStocksByMarket('KOSPI')).resolves.toEqual([
      {
        stockCode: '005930',
        name: '삼성전자',
        market: 'KOSPI',
        securityType: 'STOCK',
        isCommonShare: true,
        isinCode: 'KR7005930003',
      },
    ]);
    expect(request).toHaveBeenCalledWith(
      '/stocks/all?market=KOSPI&status=ACTIVE',
      { method: 'GET' },
    );
  });

  it('시장별 전체 종목 응답이 비어 있으면 빈 배열을 반환한다', async () => {
    request.mockResolvedValue({ result: [] });

    await expect(service.getStocksByMarket('NASDAQ')).resolves.toEqual([]);
  });
});
