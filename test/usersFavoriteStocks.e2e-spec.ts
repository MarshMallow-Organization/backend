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

const PATH = '/users/me/favorite-stocks';

const SAMSUNG = { stockCode: '005930', stockName: '삼성전자' };
const HYNIX = { stockCode: '000660', stockName: 'SK하이닉스' };

interface FavoriteStockItem {
  id: number;
  stockCode: string;
  stockName: string;
  market: string | null;
  createdAt: string;
}

interface FavoriteStockList {
  favoriteStocks: FavoriteStockItem[];
}

interface FavoriteStockStatus {
  isFavorite: boolean;
  favoriteStock: FavoriteStockItem | null;
}

interface RemoveResult {
  stockCode: string;
  removed: boolean;
}

interface ErrorBody {
  code: string;
  message: string;
  traceId: string;
}

/**
 * supertest의 response.body는 any다. 접근할 때마다 unsafe 경고가 나므로
 * 여기서 한 번만 좁혀 쓴다.
 */
const dataOf = <T>(response: request.Response): T =>
  (response.body as { data: T }).data;

const errorOf = (response: request.Response): ErrorBody =>
  response.body as ErrorBody;

/** StubAuthGuard가 읽는 헤더. 없으면 TEST_USER_ID로 동작한다. */
const asUser = (userId: number) => ({ 'x-stub-user-id': String(userId) });

describe('관심종목 (users/me/favorite-stocks)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  const addFavorite = (body: Record<string, unknown>, userId = TEST_USER_ID) =>
    request(app.getHttpServer()).post(PATH).set(asUser(userId)).send(body);

  const getFavorites = (userId = TEST_USER_ID) =>
    request(app.getHttpServer()).get(PATH).set(asUser(userId));

  const getStatus = (stockCode: string, userId = TEST_USER_ID) =>
    request(app.getHttpServer())
      .get(`${PATH}/${stockCode}`)
      .set(asUser(userId));

  const removeFavorite = (stockCode: string, userId = TEST_USER_ID) =>
    request(app.getHttpServer())
      .delete(`${PATH}/${stockCode}`)
      .set(asUser(userId));

  describe('POST /users/me/favorite-stocks', () => {
    it('관심종목을 등록하고 항목을 반환한다', async () => {
      const response = await addFavorite(SAMSUNG).expect(201);
      const created = dataOf<FavoriteStockItem>(response);

      expect(created).toMatchObject(SAMSUNG);
      expect(typeof created.id).toBe('number');

      /** 명세는 ISO 8601 문자열이다. Date 객체가 새어나가면 안 된다. */
      expect(typeof created.createdAt).toBe('string');
    });

    it('market은 컬럼이 없어 항상 null이지만 필드는 존재한다', async () => {
      const response = await addFavorite(SAMSUNG).expect(201);

      /** 명세가 필드 존재를 보장한다. 빠지면 프론트 타입이 바뀐다. */
      expect(dataOf<FavoriteStockItem>(response)).toHaveProperty(
        'market',
        null,
      );
    });

    it('stockName 앞뒤 공백을 잘라내고 저장한다', async () => {
      const response = await addFavorite({
        ...SAMSUNG,
        stockName: '  삼성전자  ',
      }).expect(201);

      expect(dataOf<FavoriteStockItem>(response).stockName).toBe('삼성전자');
    });

    it('같은 종목을 다시 등록하면 409 FAVORITE_STOCK_ALREADY_EXISTS를 반환한다', async () => {
      await addFavorite(SAMSUNG).expect(201);

      const response = await addFavorite(SAMSUNG).expect(409);

      /** 사전 조회가 잡아야 한다. 필터까지 흘러가면 DB_UNIQUE_CONSTRAINT가 나온다. */
      expect(errorOf(response).code).toBe('FAVORITE_STOCK_ALREADY_EXISTS');
      await expect(prisma.favoriteStock.count()).resolves.toBe(1);
    });

    it('중복은 사용자별로 판정한다', async () => {
      await addFavorite(SAMSUNG, TEST_USER_ID).expect(201);

      /** 남이 담았다고 내가 못 담으면 안 된다. 409가 나면 유니크가 잘못 걸린 것. */
      await addFavorite(SAMSUNG, OTHER_USER_ID).expect(201);

      /** 둘 다 살아남아야 한다. 하나가 갈아치워지면 여기서 걸린다. */
      const rows = await prisma.favoriteStock.findMany({
        where: { stockCode: SAMSUNG.stockCode },
        orderBy: { userId: 'asc' },
        select: { id: true, userId: true },
      });

      expect(rows.map((row) => row.userId)).toEqual([
        TEST_USER_ID,
        OTHER_USER_ID,
      ]);
      expect(new Set(rows.map((row) => row.id)).size).toBe(2);
    });

    it('같은 종목을 담은 사용자가 둘이어도 목록은 각자 것만 보인다', async () => {
      await addFavorite(SAMSUNG, TEST_USER_ID).expect(201);
      await addFavorite(SAMSUNG, OTHER_USER_ID).expect(201);
      await addFavorite(HYNIX, OTHER_USER_ID).expect(201);

      const mine = await getFavorites(TEST_USER_ID).expect(200);
      const others = await getFavorites(OTHER_USER_ID).expect(200);

      expect(
        dataOf<FavoriteStockList>(mine).favoriteStocks.map((i) => i.stockCode),
      ).toEqual([SAMSUNG.stockCode]);
      expect(
        dataOf<FavoriteStockList>(others).favoriteStocks.map(
          (i) => i.stockCode,
        ),
      ).toEqual([HYNIX.stockCode, SAMSUNG.stockCode]);
    });

    it('한 사용자가 해제해도 다른 사용자의 같은 종목은 남는다', async () => {
      await addFavorite(SAMSUNG, TEST_USER_ID).expect(201);
      await addFavorite(SAMSUNG, OTHER_USER_ID).expect(201);

      await removeFavorite(SAMSUNG.stockCode, TEST_USER_ID).expect(200);

      /** deleteMany의 where에 userId가 빠지면 둘 다 지워진다. */
      const remaining = await prisma.favoriteStock.findMany({
        where: { stockCode: SAMSUNG.stockCode },
        select: { userId: true },
      });

      expect(remaining.map((row) => row.userId)).toEqual([OTHER_USER_ID]);
      await expect(
        getStatus(SAMSUNG.stockCode, OTHER_USER_ID).expect(200),
      ).resolves.toBeDefined();
    });

    it.each([
      ['5자리', '00593'],
      ['7자리', '0059300'],
      ['영문 포함', '00593O'],
      ['빈 문자열', ''],
    ])('stockCode가 %s이면 400을 반환한다', async (_description, stockCode) => {
      await addFavorite({ ...SAMSUNG, stockCode }).expect(400);

      await expect(prisma.favoriteStock.count()).resolves.toBe(0);
    });

    it.each([
      ['필드가 없으면', {}],
      ['빈 문자열이면', { stockName: '' }],
      ['공백만 있으면', { stockName: '   ' }],
    ])('stockName이 %s 400을 반환한다', async (_description, override) => {
      await addFavorite({ stockCode: SAMSUNG.stockCode, ...override }).expect(
        400,
      );

      await expect(prisma.favoriteStock.count()).resolves.toBe(0);
    });

    it('stockName이 100자를 넘으면 400을 반환한다', async () => {
      await addFavorite({
        ...SAMSUNG,
        stockName: '가'.repeat(101),
      }).expect(400);

      await expect(prisma.favoriteStock.count()).resolves.toBe(0);
    });

    it('오류 응답은 data로 감싸지 않고 traceId를 포함한다', async () => {
      const response = await addFavorite({
        ...SAMSUNG,
        stockCode: 'abc',
      }).expect(400);

      expect(response.body).toEqual({
        code: expect.any(String) as unknown,
        message: expect.any(String) as unknown,
        traceId: expect.any(String) as unknown,
      });
    });
  });

  describe('GET /users/me/favorite-stocks', () => {
    it('등록한 종목이 없으면 빈 배열을 반환한다', async () => {
      const response = await getFavorites().expect(200);

      expect(dataOf<FavoriteStockList>(response)).toEqual({
        favoriteStocks: [],
      });
    });

    it('최근 등록 순으로 정렬해서 반환한다', async () => {
      await addFavorite(SAMSUNG).expect(201);
      await addFavorite(HYNIX).expect(201);

      const response = await getFavorites().expect(200);

      expect(
        dataOf<FavoriteStockList>(response).favoriteStocks.map(
          (item) => item.stockCode,
        ),
      ).toEqual([HYNIX.stockCode, SAMSUNG.stockCode]);
    });

    it('createdAt이 같으면 id 내림차순으로 정렬한다', async () => {
      /**
       * API로는 같은 createdAt을 만들 수 없어 직접 넣는다.
       *
       * ⚠️ 이 테스트는 타이브레이크의 '존재'를 증명하지 못한다. 서비스의
       * orderBy에서 { id: 'desc' }를 빼도 MySQL이 우연히 같은 순서를
       * 돌려줘 그대로 통과하는 것을 확인했다. 정렬 방향이 뒤집히는 회귀는
       * 잡지만, 타이브레이크가 통째로 사라지는 회귀는 잡지 못한다.
       * 순서를 진짜로 보장하는 것은 서비스의 orderBy이지 이 테스트가 아니다.
       */
      const createdAt = new Date('2026-08-15T00:00:00.000Z');

      await prisma.favoriteStock.createMany({
        data: [
          { userId: TEST_USER_ID, ...SAMSUNG, createdAt },
          { userId: TEST_USER_ID, ...HYNIX, createdAt },
        ],
      });

      const [inserted, insertedLater] = await prisma.favoriteStock.findMany({
        where: { userId: TEST_USER_ID },
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      const response = await getFavorites().expect(200);

      /** id가 큰(나중에 들어간) 행이 앞에 와야 한다. */
      expect(
        dataOf<FavoriteStockList>(response).favoriteStocks.map(
          (item) => item.id,
        ),
      ).toEqual([insertedLater.id, inserted.id]);
    });

    it('다른 사용자의 관심종목은 조회되지 않는다', async () => {
      await addFavorite(SAMSUNG, TEST_USER_ID).expect(201);

      const response = await getFavorites(OTHER_USER_ID).expect(200);

      expect(dataOf<FavoriteStockList>(response).favoriteStocks).toEqual([]);
    });
  });

  describe('GET /users/me/favorite-stocks/{stockCode}', () => {
    it('등록된 종목이면 isFavorite true와 항목을 반환한다', async () => {
      await addFavorite(SAMSUNG).expect(201);

      const response = await getStatus(SAMSUNG.stockCode).expect(200);
      const status = dataOf<FavoriteStockStatus>(response);

      expect(status.isFavorite).toBe(true);
      expect(status.favoriteStock).toMatchObject(SAMSUNG);
    });

    it('미등록 종목도 404가 아니라 200을 반환한다', async () => {
      const response = await getStatus(SAMSUNG.stockCode).expect(200);

      /** 하트 상태를 묻는 질의라 미등록도 정상 응답이다. */
      expect(dataOf<FavoriteStockStatus>(response)).toEqual({
        isFavorite: false,
        favoriteStock: null,
      });
    });

    it('다른 사용자가 등록한 종목은 미등록으로 본다', async () => {
      await addFavorite(SAMSUNG, OTHER_USER_ID).expect(201);

      const response = await getStatus(SAMSUNG.stockCode, TEST_USER_ID).expect(
        200,
      );

      expect(dataOf<FavoriteStockStatus>(response).isFavorite).toBe(false);
    });

    it('stockCode 형식이 틀리면 400을 반환한다', async () => {
      const response = await getStatus('abc').expect(400);

      expect(errorOf(response).code).toBe('BAD_REQUEST');
    });
  });

  describe('DELETE /users/me/favorite-stocks/{stockCode}', () => {
    it('관심종목을 해제한다', async () => {
      await addFavorite(SAMSUNG).expect(201);

      const response = await removeFavorite(SAMSUNG.stockCode).expect(200);

      expect(dataOf<RemoveResult>(response)).toEqual({
        stockCode: SAMSUNG.stockCode,
        removed: true,
      });
      await expect(prisma.favoriteStock.count()).resolves.toBe(0);
    });

    it('등록되지 않은 종목이면 404 FAVORITE_STOCK_NOT_FOUND를 반환한다', async () => {
      const response = await removeFavorite(SAMSUNG.stockCode).expect(404);

      /** delete를 썼다면 DB_RECORD_NOT_FOUND가 먼저 나갔을 자리다. */
      expect(errorOf(response).code).toBe('FAVORITE_STOCK_NOT_FOUND');
    });

    it('다른 사용자의 관심종목은 해제되지 않는다', async () => {
      await addFavorite(SAMSUNG, OTHER_USER_ID).expect(201);

      const response = await removeFavorite(
        SAMSUNG.stockCode,
        TEST_USER_ID,
      ).expect(404);

      /** 없는 종목과 남의 종목은 같은 404다. 403으로 나누면 존재가 드러난다. */
      expect(errorOf(response).code).toBe('FAVORITE_STOCK_NOT_FOUND');
      await expect(prisma.favoriteStock.count()).resolves.toBe(1);
    });

    it('stockCode 형식이 틀리면 400을 반환한다', async () => {
      await removeFavorite('abc').expect(400);
    });
  });
});
