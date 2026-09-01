import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { MarketsStockApiDto } from '../src/domains/api/markets-api/markets-api.dto';
import { MarketsApiService } from '../src/domains/api/markets-api/markets-api.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './e2eApp';

interface ErrorBody {
  success: false;
  code: string;
  message: string;
  traceId: string;
}

const dataOf = <T>(response: request.Response): T =>
  (response.body as { data: T }).data;

const errorOf = (response: request.Response): ErrorBody =>
  response.body as ErrorBody;

describe('Markets 종목 조회', () => {
  const stock: MarketsStockApiDto = {
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
  const getStock =
    jest.fn<(stockCode: string) => Promise<MarketsStockApiDto | null>>();
  const findUnique = jest.fn<
    () => Promise<{
      stockCode: string;
      stockName: string;
      hiddenUntil: Date;
    } | null>
  >();
  const findMany = jest.fn<
    () => Promise<
      Array<{
        stockCode: string;
        name: string;
        market: string;
        securityType: string;
        isCommonShare: boolean;
      }>
    >
  >();
  const count = jest.fn<() => Promise<number>>();

  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp((builder) => {
      builder.overrideProvider(MarketsApiService).useValue({ getStock });
      builder.overrideProvider(PrismaService).useValue({
        hiddenStock: { findUnique },
        stock: { findMany, count },
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    getStock.mockResolvedValue(stock);
  });

  it('DB의 활성 종목을 검색하고 페이지 정보를 반환한다', async () => {
    const items = [
      {
        stockCode: '005930',
        name: '삼성전자',
        market: 'KOSPI',
        securityType: 'STOCK',
        isCommonShare: true,
      },
    ];
    findMany.mockResolvedValue(items);
    count.mockResolvedValue(1);

    const response = await request(app.getHttpServer())
      .get('/stocks')
      .query({ keyword: ' 삼성 ', market: 'kospi', page: '0', size: '10' })
      .expect(200);

    expect(dataOf(response)).toEqual({
      items,
      totalCount: 1,
      page: 0,
      size: 10,
      totalPages: 1,
      hasNext: false,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          market: 'KOSPI',
          OR: [
            { stockCode: { contains: '삼성' } },
            { name: { contains: '삼성' } },
          ],
        },
        skip: 0,
        take: 10,
      }),
    );
  });

  it.each([
    ['지원하지 않는 시장', { market: 'INVALID' }],
    ['음수 페이지', { page: '-1' }],
    ['최대 크기를 넘긴 페이지', { size: '101' }],
  ])('%s 쿼리는 400을 반환한다', async (_description, query) => {
    await request(app.getHttpServer()).get('/stocks').query(query).expect(400);

    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });

  it('일반 종목의 상세 필드를 공통 data 응답으로 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .get('/stocks/AAPL')
      .expect(200);

    expect(dataOf(response)).toEqual({ ...stock, isHidden: false });
    expect(getStock).toHaveBeenCalledWith('AAPL');
  });

  it('소문자 티커를 대문자로 정규화한 뒤 조회한다', async () => {
    await request(app.getHttpServer()).get('/stocks/aapl').expect(200);

    expect(getStock).toHaveBeenCalledWith('AAPL');
  });

  it.each(['abc$', 'AA-PL', '12345678901'])(
    '올바르지 않은 stockCode %s는 400을 반환한다',
    async (stockCode) => {
      const response = await request(app.getHttpServer())
        .get(`/stocks/${stockCode}`)
        .expect(400);

      expect(errorOf(response)).toEqual({
        success: false,
        code: 'BAD_REQUEST',
        message: expect.any(String) as unknown,
        traceId: expect.any(String) as unknown,
      });
      expect(getStock).not.toHaveBeenCalled();
    },
  );

  it('활성 숨김 종목은 제한된 필드와 문자열 hiddenUntil을 반환한다', async () => {
    const hiddenUntil = new Date('2099-08-31T23:59:59.000Z');
    findUnique.mockResolvedValue({
      stockCode: '005930',
      stockName: '삼성전자',
      hiddenUntil,
    });

    const response = await request(app.getHttpServer())
      .get('/stocks/005930')
      .expect(200);

    expect(dataOf(response)).toEqual({
      symbol: '005930',
      name: '삼성전자',
      message: '숨김 처리된 종목입니다.',
      hiddenUntil: hiddenUntil.toISOString(),
      isHidden: true,
    });
    expect(getStock).not.toHaveBeenCalled();
  });

  it('존재하지 않는 종목은 공통 404 오류 형식으로 반환한다', async () => {
    getStock.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get('/stocks/UNKNOWN')
      .expect(404);

    expect(errorOf(response)).toEqual({
      success: false,
      code: 'NOT_FOUND_STOCK',
      message: '존재하지 않는 종목입니다.',
      traceId: expect.any(String) as unknown,
    });
  });
});
