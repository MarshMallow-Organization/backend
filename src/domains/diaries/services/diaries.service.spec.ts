import { BusinessException } from '../../../common/exception/businessException';
import { GetDiariesQueryDto } from '../dto/request/get-diaries-query.dto';
import {
  DiariesRepository,
  DiaryListItem,
  DiaryPageCriteria,
} from './diaries.repository';
import { DiariesService } from './diaries.service';

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

describe('DiariesService', () => {
  let service: DiariesService;
  let diariesRepository: jest.Mocked<DiariesRepository>;
  let findPage: jest.MockedFunction<DiariesRepository['findPage']>;

  const userId = 7;
  const diary: DiaryListItem = {
    diaryId: 1,
    orderId: 12,
    type: 'BUY',
    date: '2026-07-30',
    corpCode: '005930',
    corpName: '삼성전자',
    // 미체결 주문도 일기를 작성할 수 있으므로 Order.price를 사용한다.
    avgPrice: 3_600_000,
    // 체결 전에는 Order.quantity를 사용한다.
    quantity: 5,
    memo: '실적 발표 이후 상승 가능성이 있다고 판단했다.',
    createdAt: '2026-07-30T16:10:00',
  };

  beforeEach(() => {
    // findPage = jest.fn<DiariesRepository['findPage']>();
    findPage = jest.fn<
      ReturnType<DiariesRepository['findPage']>,
      Parameters<DiariesRepository['findPage']>
    >();
    diariesRepository = {
      findPage,
    };

    service = new DiariesService(diariesRepository);
  });

  describe('getDiaries', () => {
    it('조회 조건이 없으면 첫 페이지를 기본 크기로 조회한다', async () => {
      findPage.mockResolvedValue({
        items: [diary],
        totalElements: 1,
      });

      const result = await service.getDiaries(userId, {});

      expect(findPage).toHaveBeenCalledWith(userId, {
        page: 0,
        size: 10,
        orderBy: [{ date: 'desc' }, { diaryId: 'desc' }],
      });
      expect(result).toEqual({
        items: [diary],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      });
    });

    it('요청한 페이지와 크기로 페이지네이션 정보를 계산한다', async () => {
      findPage.mockResolvedValue({
        items: [diary],
        totalElements: 45,
      });

      const result = await service.getDiaries(userId, {
        page: 1,
        size: 20,
      });

      expect(result).toMatchObject({
        page: 1,
        size: 20,
        totalElements: 45,
        totalPages: 3,
        hasNext: true,
      });
    });

    it.each<{
      name: string;
      query: GetDiariesQueryDto;
      expected: Partial<DiaryPageCriteria>;
    }>([
      {
        name: '특정 날짜 목록',
        query: { dates: ['2026-08-01', '2026-08-03'] },
        expected: { dates: ['2026-08-01', '2026-08-03'] },
      },
      {
        name: '시작일과 종료일',
        query: { startDate: '2026-08-01', endDate: '2026-08-31' },
        expected: { startDate: '2026-08-01', endDate: '2026-08-31' },
      },
      {
        name: '종목 코드 목록',
        query: { companies: ['000660', '005930'] },
        expected: { companies: ['000660', '005930'] },
      },
    ])('$name 조건을 repository에 전달한다', async ({ query, expected }) => {
      findPage.mockResolvedValue({
        items: [],
        totalElements: 0,
      });

      await service.getDiaries(userId, query);

      expect(findPage).toHaveBeenCalledWith(
        userId,
        expect.objectContaining(expected),
      );
    });

    it('조회 결과가 없으면 빈 페이지를 반환한다', async () => {
      findPage.mockResolvedValue({
        items: [],
        totalElements: 0,
      });

      const result = await service.getDiaries(userId, {});

      expect(result).toEqual({
        items: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
      });
    });

    it.each<{ query: GetDiariesQueryDto; description: string }>([
      {
        query: { startDate: '2026-08-01' },
        description: '시작일만 전달',
      },
      {
        query: { endDate: '2026-08-31' },
        description: '종료일만 전달',
      },
      {
        query: {
          dates: ['2026-08-01'],
          startDate: '2026-08-01',
          endDate: '2026-08-31',
        },
        description: '특정 날짜와 기간을 함께 전달',
      },
    ])(
      '$description: 잘못된 기간 조건이면 INVALID_DATE_RANGE를 던진다',
      async ({ query }) => {
        await expectBusinessException(
          service.getDiaries(userId, query),
          'INVALID_DATE_RANGE',
        );
        expect(findPage).not.toHaveBeenCalled();
      },
    );

    it.each<{ query: GetDiariesQueryDto; description: string }>([
      { query: { page: -1 }, description: '음수 페이지' },
      { query: { size: 0 }, description: '0인 페이지 크기' },
      {
        query: { size: 21 },
        description: '최대 크기를 초과한 페이지 크기',
      },
    ])(
      '$description: 쿼리 범위가 잘못되면 INVALID_QUERY_PARAMETER를 던진다',
      async ({ query }) => {
        await expectBusinessException(
          service.getDiaries(userId, query),
          'INVALID_QUERY_PARAMETER',
        );
        expect(findPage).not.toHaveBeenCalled();
      },
    );
  });
});
/*
테스트 코드
   ↓
DiariesService.getDiaries()
   ↓
가짜 DiariesRepository.findPage()
   ↓
미리 지정한 결과 반환
   ↓
Service 결과 검증
 */
