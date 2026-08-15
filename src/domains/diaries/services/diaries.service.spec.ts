import { BusinessException } from '../../../common/exception/businessException';
import { GetDiariesQueryDto } from '../dto/request/get-diaries-query.dto';
import { DiariesRepository } from '../repositories/diaries.repository';
import { DiaryPreviewDto } from '../dto/response/diary-preview.dto';
import { DiaryPageCriteria, DiaryPageResult } from '../models/diary-page.model';
import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  PostDiariesDto,
  SellReasonCode,
} from '../dto/request/post-diaries.dto';
import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { DiaryOrderSnapshot } from '../models/diary-order-snapshot.model';
import { DiariesService } from './diaries.service';
import { BuyDiaryDetailDto } from '../dto/response/diary-detail-response.dto';

type CreateDiaryRepository = Pick<
  DiariesRepository,
  'findOrderById' | 'existsActiveDiary' | 'createDiary'
>;

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
  let findDetailById: jest.MockedFunction<DiariesRepository['findDetailById']>;
  let findPage: jest.MockedFunction<DiariesRepository['findPage']>;
  let createDiaryRepository: jest.Mocked<CreateDiaryRepository>;

  const userId = 7;
  const diary: DiaryPreviewDto = {
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
    findDetailById = jest.fn();
    findPage = jest.fn(
      (
        _userId: number,
        _criteria: DiaryPageCriteria,
      ): Promise<DiaryPageResult> => {
        void _userId;
        void _criteria;

        return Promise.resolve({
          items: [],
          totalElements: 0,
        });
      },
    );
    createDiaryRepository = {
      findOrderById: jest.fn(),
      existsActiveDiary: jest.fn(),
      createDiary: jest.fn(),
    };
    diariesRepository = {
      findDetailById,
      findPage,
      ...createDiaryRepository,
    };

    service = new DiariesService(diariesRepository);
  });

  describe('getDiaryDetail', () => {
    const detail: BuyDiaryDetailDto = {
      diaryId: 1,
      orderId: 12,
      type: DiaryType.BUY,
      date: '2026-07-30',
      corpCode: '005930',
      corpName: '삼성전자',
      orderedAt: '2026-07-30T15:56:00.000Z',
      price: 255_000,
      quantity: 5,
      totalAmount: 1_275_000,
      perAtTrade: 6.4,
      pbrAtTrade: 2.8,
      marketCapAtTrade: 1_698_000_000_000_000,
      candelChartAtUrl: 'https://example.com/candle.png',
      buyReason: '저평가 구간이라고 판단했다.',
      goalPrice: 290_000,
      goalHoldPeriod: GoalHoldPeriod.MID_TERM,
      emotion: 1,
      memo: '실적 발표 전까지 관찰하기',
      createdAt: '2026-07-30T16:10:00.000Z',
      updatedAt: '2026-07-30T16:10:00.000Z',
    };

    it('사용자와 일기 ID로 상세를 조회한다', async () => {
      findDetailById.mockResolvedValue(detail);

      await expect(service.getDiaryDetail(userId, 1)).resolves.toEqual(detail);
      expect(findDetailById).toHaveBeenCalledWith(userId, 1);
    });

    it('일기가 없거나 소유자가 다르면 DIARY_NOT_FOUND를 던진다', async () => {
      findDetailById.mockResolvedValue(null);

      await expectBusinessException(
        service.getDiaryDetail(userId, 999),
        'DIARY_NOT_FOUND',
      );
    });
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

  describe('createDiary', () => {
    const order: DiaryOrderSnapshot = {
      orderId: 12,
      userId,
      type: DiaryType.BUY,
      corpCode: '005930',
      corpName: '삼성전자',
      perAtOrder: 12.4,
      pbrAtOrder: 1.1,
      marketCapAtOrder: 430_000_000_000_000,
      candleChartAtOrderUrl: 'https://example.com/charts/005930.png',
    };
    const buyRequest: PostDiariesDto = {
      orderId: order.orderId,
      type: DiaryType.BUY,
      date: '2026-07-30',
      buyReason: 'AI 반도체 수요 증가와 저평가 구간이라고 판단했다.',
      goalPrice: 290_000,
      goalHoldPeriod: GoalHoldPeriod.CUSTOM,
      customGoalHoldPeriod: '45일',
      emotion: 1,
      memo: '실적 발표 전까지 관찰하기',
    };
    const created: CreateDiaryResponseDto = {
      diaryId: 1,
      orderId: order.orderId,
      type: DiaryType.BUY,
      date: '2026-07-30',
      createdAt: '2026-07-30T16:10:00.000Z',
    };

    const createDiary = (
      request: PostDiariesDto,
    ): Promise<CreateDiaryResponseDto> => service.createDiary(userId, request);

    beforeEach(() => {
      createDiaryRepository.findOrderById.mockResolvedValue(order);
      createDiaryRepository.existsActiveDiary.mockResolvedValue(false);
      createDiaryRepository.createDiary.mockResolvedValue(created);
    });

    it('BUY 일기를 주문의 서버 관리 스냅샷과 함께 생성한다', async () => {
      const result = await createDiary(buyRequest);

      expect(createDiaryRepository.findOrderById).toHaveBeenCalledWith(
        order.orderId,
      );
      expect(createDiaryRepository.existsActiveDiary).toHaveBeenCalledWith(
        userId,
        order.orderId,
      );
      expect(createDiaryRepository.createDiary).toHaveBeenCalledWith(userId, {
        ...buyRequest,
        corpCode: order.corpCode,
        corpName: order.corpName,
        perAtOrder: order.perAtOrder,
        pbrAtOrder: order.pbrAtOrder,
        marketCapAtOrder: order.marketCapAtOrder,
        candleChartAtOrderUrl: order.candleChartAtOrderUrl,
      });
      expect(result).toEqual(created);
    });

    it('SELL 일기를 SELL 전용 필드와 함께 생성한다', async () => {
      const sellOrder: DiaryOrderSnapshot = {
        ...order,
        orderId: 15,
        type: DiaryType.SELL,
      };
      const sellRequest: PostDiariesDto = {
        orderId: sellOrder.orderId,
        type: DiaryType.SELL,
        date: '2026-07-30',
        sellReasonCode: SellReasonCode.GOAL_REACHED,
        sellReasonDetail: '목표 가격에 도달하여 계획대로 매도했다.',
        goalEvaluationCode: GoalEvaluationCode.KEPT_GOAL,
        goalEvaluationDetail: '원칙을 지킨 거래였다.',
        emotion: 2,
        memo: '앞으로도 계획에 따라 매도할 것',
      };
      const sellCreated: CreateDiaryResponseDto = {
        ...created,
        orderId: sellOrder.orderId,
        type: DiaryType.SELL,
      };
      createDiaryRepository.findOrderById.mockResolvedValue(sellOrder);
      createDiaryRepository.createDiary.mockResolvedValue(sellCreated);

      const result = await createDiary(sellRequest);

      expect(createDiaryRepository.createDiary).toHaveBeenCalledWith(
        userId,
        expect.objectContaining(sellRequest),
      );
      expect(result).toEqual(sellCreated);
    });

    it('주문이 없으면 ORDER_NOT_FOUND를 던진다', async () => {
      createDiaryRepository.findOrderById.mockResolvedValue(null);

      await expectBusinessException(createDiary(buyRequest), 'ORDER_NOT_FOUND');
      expect(createDiaryRepository.existsActiveDiary).not.toHaveBeenCalled();
      expect(createDiaryRepository.createDiary).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주문이면 존재 여부를 숨기고 ORDER_NOT_FOUND를 던진다', async () => {
      createDiaryRepository.findOrderById.mockResolvedValue({
        ...order,
        userId: userId + 1,
      });

      await expectBusinessException(createDiary(buyRequest), 'ORDER_NOT_FOUND');
      expect(createDiaryRepository.existsActiveDiary).not.toHaveBeenCalled();
      expect(createDiaryRepository.createDiary).not.toHaveBeenCalled();
    });

    it('요청 type과 주문 유형이 다르면 ORDER_TYPE_MISMATCH를 던진다', async () => {
      createDiaryRepository.findOrderById.mockResolvedValue({
        ...order,
        type: DiaryType.SELL,
      });

      await expectBusinessException(
        createDiary(buyRequest),
        'ORDER_TYPE_MISMATCH',
      );
      expect(createDiaryRepository.existsActiveDiary).not.toHaveBeenCalled();
      expect(createDiaryRepository.createDiary).not.toHaveBeenCalled();
    });

    it('같은 주문의 활성 일기가 있으면 DIARY_ALREADY_EXISTS를 던진다', async () => {
      createDiaryRepository.existsActiveDiary.mockResolvedValue(true);

      await expectBusinessException(
        createDiary(buyRequest),
        'DIARY_ALREADY_EXISTS',
      );
      expect(createDiaryRepository.createDiary).not.toHaveBeenCalled();
    });
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
