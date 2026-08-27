import { BusinessException } from '../../../common/exception/businessException';
import { PrismaService } from '../../../prisma/prisma.service';
import { PostHiddenStockDto } from '../dto/request/post-hidden-stock.dto';
import { HiddenStockService } from './hidden-stock.service';

const expectBusinessException = async (
  promise: Promise<unknown>,
  code: string,
): Promise<void> => {
  try {
    await promise;
    throw new Error(`Expected BusinessException with code ${code}`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(BusinessException);

    if (!(error instanceof BusinessException)) {
      throw error;
    }

    expect(error.definition.code).toBe(code);
  }
};

describe('HiddenStockService', () => {
  const userId = 7;
  const dto: PostHiddenStockDto = {
    stockCode: '005930',
    hiddenUntil: '2099-08-31T23:59:59.000Z',
  };
  const createdAt = new Date('2026-08-14T09:00:00.000Z');

  const findUnique = jest.fn((): Promise<{ id: number } | null> =>
    Promise.resolve(null),
  );
  const create = jest.fn(() =>
    Promise.resolve({
      stockCode: dto.stockCode,
      stockName: '삼성전자',
      createdAt,
      hiddenUntil: new Date(dto.hiddenUntil),
    }),
  );

  let service: HiddenStockService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);

    const prisma = {
      hiddenStock: { findUnique, create },
    } as unknown as PrismaService;

    service = new HiddenStockService(prisma);
  });

  it('종목을 숨김 테이블에 저장하고 응답 값을 반환한다', async () => {
    const result = await service.hideStock(userId, dto);

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_stockCode: {
          userId,
          stockCode: dto.stockCode,
        },
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId,
        stockCode: dto.stockCode,
        stockName: '삼성전자',
        hiddenUntil: new Date(dto.hiddenUntil),
      },
    });
    expect(result).toEqual({
      stockCode: dto.stockCode,
      stockName: '삼성전자',
      hiddenAt: createdAt,
      hiddenUntil: new Date(dto.hiddenUntil),
    });
  });

  it('이미 숨긴 종목이면 CONFLICT를 던진다', async () => {
    findUnique.mockResolvedValue({ id: 1 });

    await expectBusinessException(service.hideStock(userId, dto), 'CONFLICT');
    expect(create).not.toHaveBeenCalled();
  });

  it('숨김 종료 시간이 현재보다 과거이면 HIDDEN_UNTIL_IN_PAST를 던진다', async () => {
    const pastDto = {
      ...dto,
      hiddenUntil: '2000-01-01T00:00:00.000Z',
    };

    await expectBusinessException(
      service.hideStock(userId, pastDto),
      'HIDDEN_UNTIL_IN_PAST',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('존재하지 않는 종목 코드이면 NOT_FOUND_STOCK을 던진다', async () => {
    const invalidDto = {
      ...dto,
      stockCode: '999999',
    };

    await expectBusinessException(
      service.hideStock(userId, invalidDto),
      'NOT_FOUND_STOCK',
    );
    expect(create).not.toHaveBeenCalled();
  });
});
