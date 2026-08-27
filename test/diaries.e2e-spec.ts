import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  OTHER_USER_ID,
  resetDatabase,
  TEST_USER_ID,
} from './e2eApp';

const PATH = '/diaries';
const asUser = (userId: number) => ({ 'x-stub-user-id': String(userId) });

jest.setTimeout(30_000);

interface ErrorBody {
  code: string;
}

interface CreatedDiary {
  diaryId: number;
  orderId: number;
  type: 'BUY' | 'SELL';
  date: string;
  createdAt: string;
}

interface BuyPrefill {
  orderId: number;
  type: 'BUY';
  price: number | null;
  quantity: number;
  totalAmount: number | null;
  perAtOrder: number | null;
  pbrAtOrder: number | null;
  marketCapAtOrder: number | null;
  candleChartAtUrl: string | null;
}

interface DiaryList {
  items: Array<{
    diaryId: number;
    corpCode: string;
    avgPrice: number | null;
    quantity: number;
    memo: string | null;
  }>;
  totalElements: number;
}

interface BuyDetail {
  diaryId: number;
  type: 'BUY';
  price: number | null;
  quantity: number;
  totalAmount: number | null;
  perAtOrder: number | null;
  candleChartAtUrl: string | null;
  buyReason: string;
  memo: string | null;
}

interface SellDetail {
  diaryId: number;
  type: 'SELL';
  sellPrice: number | null;
  quantity: number;
  totalSellAmount: number | null;
  realizedProfit: number | null;
  returnRate: number | null;
  candleChartAtUrl: string | null;
}

interface UpdatedDiary {
  diaryId: number;
  price: number | null;
  quantity: number;
  totalAmount: number | null;
  buyReason: string;
  memo: string | null;
  updatedAt: string;
}

interface DeletedDiary {
  diaryId: number;
  deleted: true;
  deletedAt: string;
}

const dataOf = <T>(response: request.Response): T =>
  (response.body as { data: T }).data;

const errorOf = (response: request.Response): ErrorBody =>
  response.body as ErrorBody;

describe('매매 일기 (diaries)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buyOrderId: number;
  let sellOrderId: number;
  let otherUserOrderId: number;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const currency = await prisma.currency.create({
      data: { currency: 'KRW' },
    });
    const [buyOrder, sellOrder, otherOrder] = await Promise.all([
      prisma.order.create({
        data: {
          tradeType: 'BUY',
          quantity: 5,
          price: 71000,
          corpCode: '005930',
          corpName: '삼성전자',
          perAtOrder: 12.4,
          pbrAtOrder: 1.1,
          marketCapAtOrder: 430_000_000_000_000,
          userId: TEST_USER_ID,
          currenciesId: currency.id,
        },
      }),
      prisma.order.create({
        data: {
          tradeType: 'SELL',
          quantity: 5,
          price: 80000,
          corpCode: '000660',
          corpName: 'SK하이닉스',
          perAtOrder: 8.2,
          pbrAtOrder: 1.4,
          marketCapAtOrder: 150_000_000_000_000,
          userId: TEST_USER_ID,
          currenciesId: currency.id,
        },
      }),
      prisma.order.create({
        data: {
          tradeType: 'BUY',
          quantity: 1,
          price: 10000,
          corpCode: '035420',
          corpName: 'NAVER',
          userId: OTHER_USER_ID,
          currenciesId: currency.id,
        },
      }),
    ]);

    buyOrderId = buyOrder.id;
    sellOrderId = sellOrder.id;
    otherUserOrderId = otherOrder.id;

    await prisma.trade.createMany({
      data: [
        {
          externalTradeId: 'BUY-1',
          tradeType: 'BUY',
          corpCode: '005930',
          corpName: '삼성전자',
          tradedAt: new Date('2026-08-18T01:00:00.000Z'),
          price: 70000,
          quantity: 2,
          totalPrice: 140000,
          userId: TEST_USER_ID,
          currenciesId: currency.id,
          ordersId: buyOrder.id,
        },
        {
          externalTradeId: 'BUY-2',
          tradeType: 'BUY',
          corpCode: '005930',
          corpName: '삼성전자',
          tradedAt: new Date('2026-08-18T01:01:00.000Z'),
          price: 73000,
          quantity: 3,
          totalPrice: 219000,
          userId: TEST_USER_ID,
          currenciesId: currency.id,
          ordersId: buyOrder.id,
        },
        {
          externalTradeId: 'SELL-1',
          tradeType: 'SELL',
          corpCode: '000660',
          corpName: 'SK하이닉스',
          tradedAt: new Date('2026-08-19T01:00:00.000Z'),
          price: 80000,
          quantity: 2,
          totalPrice: 160000,
          realizedProfit: 10000,
          returnRate: 5,
          userId: TEST_USER_ID,
          currenciesId: currency.id,
          ordersId: sellOrder.id,
        },
        {
          externalTradeId: 'SELL-2',
          tradeType: 'SELL',
          corpCode: '000660',
          corpName: 'SK하이닉스',
          tradedAt: new Date('2026-08-19T01:01:00.000Z'),
          price: 82000,
          quantity: 3,
          totalPrice: 246000,
          realizedProfit: 21000,
          returnRate: 10,
          userId: TEST_USER_ID,
          currenciesId: currency.id,
          ordersId: sellOrder.id,
        },
      ],
    });
  });

  const createBuyDiary = (orderId = buyOrderId, userId = TEST_USER_ID) =>
    request(app.getHttpServer()).post(PATH).set(asUser(userId)).send({
      orderId,
      type: 'BUY',
      date: '2026-08-18',
      emotion: 2,
      buyReason: '분할 매수 테스트',
      goalPrice: 90000,
      goalHoldPeriod: 'MID_TERM',
      memo: 'DB에서 확인할 BUY 메모',
    });

  const createSellDiary = () =>
    request(app.getHttpServer()).post(PATH).set(asUser(TEST_USER_ID)).send({
      orderId: sellOrderId,
      type: 'SELL',
      date: '2026-08-19',
      emotion: 3,
      sellReasonCode: 'PROFIT_TAKING',
      sellReasonDetail: '수익 실현',
      memo: 'DB에서 확인할 SELL 메모',
    });

  it('분할 체결 자동채움과 nullable 차트 필드를 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .get(`${PATH}/prefill`)
      .query({ orderId: buyOrderId })
      .set(asUser(TEST_USER_ID))
      .expect(200);

    expect(dataOf<BuyPrefill>(response)).toMatchObject({
      orderId: buyOrderId,
      type: 'BUY',
      price: 71800,
      quantity: 5,
      totalAmount: 359000,
      perAtOrder: 12.4,
      pbrAtOrder: 1.1,
      marketCapAtOrder: 430_000_000_000_000,
      candleChartAtUrl: null,
    });
  });

  it('BUY 일기와 BuyDiary를 하나의 요청으로 저장한다', async () => {
    const response = await createBuyDiary().expect(201);
    const created = dataOf<CreatedDiary>(response);

    const diary = await prisma.diary.findUnique({
      where: { id: created.diaryId },
      include: { buyDiary: true, sellDiary: true },
    });

    expect(diary).toMatchObject({
      orderId: buyOrderId,
      userId: TEST_USER_ID,
      type: 'BUY',
      corpCode: '005930',
      sellDiary: null,
    });
    expect(Number(diary?.perAtOrder)).toBe(12.4);
    expect(diary?.buyDiary).toMatchObject({
      buyReason: '분할 매수 테스트',
      emotion: 2,
      memo: 'DB에서 확인할 BUY 메모',
    });
  });

  it('같은 주문의 동시 생성 요청 중 하나만 성공한다', async () => {
    const [first, second] = await Promise.all([
      createBuyDiary(),
      createBuyDiary(),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    await expect(
      prisma.diary.count({
        where: { orderId: buyOrderId, deletedAt: null },
      }),
    ).resolves.toBe(1);
  });

  it('타인의 주문은 존재하지 않는 주문처럼 숨긴다', async () => {
    const response = await createBuyDiary(otherUserOrderId).expect(404);

    expect(errorOf(response).code).toBe('ORDER_NOT_FOUND');
  });

  it('목록과 상세에서 체결 요약, 스냅샷, null 이미지를 반환한다', async () => {
    const created = dataOf<CreatedDiary>(await createBuyDiary().expect(201));

    const listResponse = await request(app.getHttpServer())
      .get(PATH)
      .query({ companies: '005930' })
      .set(asUser(TEST_USER_ID))
      .expect(200);
    expect(dataOf<DiaryList>(listResponse)).toMatchObject({
      totalElements: 1,
      items: [
        {
          diaryId: created.diaryId,
          corpCode: '005930',
          avgPrice: 71800,
          quantity: 5,
          memo: 'DB에서 확인할 BUY 메모',
        },
      ],
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`${PATH}/${created.diaryId}`)
      .set(asUser(TEST_USER_ID))
      .expect(200);
    expect(dataOf<BuyDetail>(detailResponse)).toMatchObject({
      diaryId: created.diaryId,
      type: 'BUY',
      price: 71800,
      quantity: 5,
      totalAmount: 359000,
      perAtOrder: 12.4,
      candleChartAtUrl: null,
      buyReason: '분할 매수 테스트',
    });
  });

  it('BUY 일기를 수정하고 공통/하위 테이블 값을 함께 반환한다', async () => {
    const created = dataOf<CreatedDiary>(await createBuyDiary().expect(201));
    const response = await request(app.getHttpServer())
      .patch(`${PATH}/${created.diaryId}`)
      .set(asUser(TEST_USER_ID))
      .send({
        date: '2026-08-20',
        buyReason: '수정된 매수 이유',
        memo: null,
      })
      .expect(200);

    expect(dataOf<UpdatedDiary>(response)).toMatchObject({
      diaryId: created.diaryId,
      price: 71800,
      quantity: 5,
      totalAmount: 359000,
      buyReason: '수정된 매수 이유',
      memo: null,
    });

    const diary = await prisma.diary.findUnique({
      where: { id: created.diaryId },
      include: { buyDiary: true },
    });
    expect(diary?.date.toISOString().slice(0, 10)).toBe('2026-08-20');
    expect(diary?.buyDiary?.memo).toBeNull();
  });

  it('BUY 일기에 SELL 전용 필드를 보내면 400을 반환한다', async () => {
    const created = dataOf<CreatedDiary>(await createBuyDiary().expect(201));
    const response = await request(app.getHttpServer())
      .patch(`${PATH}/${created.diaryId}`)
      .set(asUser(TEST_USER_ID))
      .send({ sellReasonDetail: '잘못된 필드' })
      .expect(400);

    expect(errorOf(response).code).toBe('INVALID_DIARY_UPDATE');
  });

  it('soft delete는 반복 요청에도 최초 deletedAt을 유지한다', async () => {
    const created = dataOf<CreatedDiary>(await createBuyDiary().expect(201));
    const first = dataOf<DeletedDiary>(
      await request(app.getHttpServer())
        .delete(`${PATH}/${created.diaryId}`)
        .set(asUser(TEST_USER_ID))
        .expect(200),
    );
    const second = dataOf<DeletedDiary>(
      await request(app.getHttpServer())
        .delete(`${PATH}/${created.diaryId}`)
        .set(asUser(TEST_USER_ID))
        .expect(200),
    );

    expect(second.deletedAt).toBe(first.deletedAt);
    await request(app.getHttpServer())
      .get(`${PATH}/${created.diaryId}`)
      .set(asUser(TEST_USER_ID))
      .expect(404);

    await createBuyDiary().expect(201);
  });

  it('SELL 일기의 손익과 가중 수익률을 계산해 DB 확인용 데이터를 남긴다', async () => {
    const buy = dataOf<CreatedDiary>(await createBuyDiary().expect(201));
    const sell = dataOf<CreatedDiary>(await createSellDiary().expect(201));

    const response = await request(app.getHttpServer())
      .get(`${PATH}/${sell.diaryId}`)
      .set(asUser(TEST_USER_ID))
      .expect(200);

    expect(dataOf<SellDetail>(response)).toMatchObject({
      diaryId: sell.diaryId,
      type: 'SELL',
      sellPrice: 81200,
      quantity: 5,
      totalSellAmount: 406000,
      realizedProfit: 31000,
      returnRate: 8,
      candleChartAtUrl: null,
    });

    await expect(
      prisma.diary.count({
        where: { id: { in: [buy.diaryId, sell.diaryId] } },
      }),
    ).resolves.toBe(2);
  });
});
