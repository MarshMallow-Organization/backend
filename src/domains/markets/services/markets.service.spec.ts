import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketsService } from './markets.service';

describe('MarketsService', () => {
  type HiddenStockLookup = {
    stockCode: string;
    stockName: string;
    hiddenUntil: Date;
  };

  const userId = 7;
  const stockCode = '005930';
  const hiddenUntil = new Date('2099-08-31T23:59:59.000Z');

  const findUnique = jest.fn<
    (where: unknown) => Promise<HiddenStockLookup | null>
  >(() => Promise.resolve(null));

  let service: MarketsService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);

    const prisma = {
      hiddenStock: { findUnique },
    } as unknown as PrismaService;

    service = new MarketsService(prisma);
  });

  it('활성 숨김 종목이면 DB의 숨김 정보를 반환한다', async () => {
    findUnique.mockResolvedValue({
      stockCode,
      stockName: '삼성전자',
      hiddenUntil,
    });

    const result = await service.getStock(userId, stockCode);

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_stockCode: {
          userId,
          stockCode,
        },
      },
    });
    expect(result).toEqual({
      symbol: stockCode,
      name: '삼성전자',
      message: '숨김 처리된 종목입니다.',
      hiddenUntil,
      isHidden: true,
    });
  });

  it('숨김 종목이 아니면 기본 종목 정보를 반환한다', async () => {
    const result = await service.getStock(userId, stockCode);

    expect(result).toEqual({
      symbol: stockCode,
      name: '삼성전자',
      isHidden: false,
    });
  });

  it('존재하지 않는 종목 코드이면 NOT_FOUND_STOCK을 던진다', async () => {
    await expect(service.getStock(userId, '999999')).rejects.toMatchObject({
      definition: {
        code: 'NOT_FOUND_STOCK',
      },
    });
  });
});
