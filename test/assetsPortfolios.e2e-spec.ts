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

const PATH = '/assets/portfolios';

interface PortfolioSummary {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

interface PortfolioList {
  portfolios: PortfolioSummary[];
  maxCount: number;
}

interface PortfolioNameUpdated {
  id: number;
  name: string;
  updatedAt: string;
}

interface PortfolioDeleted {
  id: number;
  deleted: boolean;
}

interface PortfolioStockAdded {
  portfolioId: number;
  stockCode: string;
  addedAt: string;
}

interface PortfolioStockRemoved {
  portfolioId: number;
  stockCode: string;
  removed: boolean;
}

interface Holding {
  stockCode: string;
  stockName: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  evaluationAmount: number;
  unrealizedProfit: number;
  returnRate: number;
}

interface PortfolioDetail {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
  totalReturnRate: number;
  holdings: Holding[];
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

describe('가상계좌 (assets/portfolios)', () => {
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

  const createPortfolio = (name: string, userId = TEST_USER_ID) =>
    request(app.getHttpServer()).post(PATH).set(asUser(userId)).send({ name });

  const getPortfolios = (userId = TEST_USER_ID) =>
    request(app.getHttpServer()).get(PATH).set(asUser(userId));

  const reorderPortfolios = (portfolioIds: number[], userId = TEST_USER_ID) =>
    request(app.getHttpServer())
      .patch(`${PATH}/order`)
      .set(asUser(userId))
      .send({ portfolioIds });

  const renamePortfolio = (
    portfolioId: number,
    name: string,
    userId = TEST_USER_ID,
  ) =>
    request(app.getHttpServer())
      .patch(`${PATH}/${portfolioId}`)
      .set(asUser(userId))
      .send({ name });

  const deletePortfolio = (portfolioId: number, userId = TEST_USER_ID) =>
    request(app.getHttpServer())
      .delete(`${PATH}/${portfolioId}`)
      .set(asUser(userId));

  const addStock = (
    portfolioId: number,
    stockCode: string,
    userId = TEST_USER_ID,
  ) =>
    request(app.getHttpServer())
      .post(`${PATH}/${portfolioId}/stocks`)
      .set(asUser(userId))
      .send({ stockCode });

  const removeStock = (
    portfolioId: number,
    stockCode: string,
    userId = TEST_USER_ID,
  ) =>
    request(app.getHttpServer())
      .delete(`${PATH}/${portfolioId}/stocks/${stockCode}`)
      .set(asUser(userId));

  const getPortfolioDetail = (portfolioId: number, userId = TEST_USER_ID) =>
    request(app.getHttpServer())
      .get(`${PATH}/${portfolioId}`)
      .set(asUser(userId));

  /** 존재하지 않는 ID. 각 테스트가 만드는 계좌 수를 훨씬 넘는 값이면 된다. */
  const MISSING_PORTFOLIO_ID = 999_999;

  /** 응답 목록을 이름 배열로 줄인다. 순서 검증을 읽기 쉽게 만든다. */
  const namesInOrder = (response: request.Response) =>
    dataOf<PortfolioList>(response).portfolios.map(
      (portfolio) => portfolio.name,
    );

  describe('POST /assets/portfolios', () => {
    it('가상계좌를 생성하고 첫 sortOrder를 0으로 매긴다', async () => {
      const response = await createPortfolio('안전형 투자').expect(201);
      const created = dataOf<PortfolioSummary>(response);

      expect(created).toMatchObject({ name: '안전형 투자', sortOrder: 0 });
      expect(typeof created.id).toBe('number');

      /** 명세는 ISO 8601 문자열이다. Date 객체가 새어나가면 안 된다. */
      expect(typeof created.createdAt).toBe('string');
    });

    it('두 번째 가상계좌의 sortOrder는 1이다', async () => {
      await createPortfolio('안전형 투자').expect(201);

      const response = await createPortfolio('공격형 투자').expect(201);

      expect(dataOf<PortfolioSummary>(response).sortOrder).toBe(1);
    });

    it('이름 앞뒤 공백을 잘라내고 저장한다', async () => {
      const response = await createPortfolio('  배당주  ').expect(201);

      expect(dataOf<PortfolioSummary>(response).name).toBe('배당주');
    });

    it('공백만 있는 이름은 400을 반환한다', async () => {
      const response = await createPortfolio('   ').expect(400);

      expect(errorOf(response).code).toBe('BAD_REQUEST');
      await expect(prisma.virtualPortfolio.count()).resolves.toBe(0);
    });

    it('30자를 넘는 이름은 400을 반환한다', async () => {
      await createPortfolio('가'.repeat(31)).expect(400);

      await expect(prisma.virtualPortfolio.count()).resolves.toBe(0);
    });

    it('같은 이름이 이미 있으면 409 PORTFOLIO_NAME_DUPLICATED를 반환한다', async () => {
      await createPortfolio('안전형 투자').expect(201);

      const response = await createPortfolio('안전형 투자').expect(409);

      /** 사전 조회가 잡아야 한다. 필터까지 흘러가면 DB_UNIQUE_CONSTRAINT가 나온다. */
      expect(errorOf(response).code).toBe('PORTFOLIO_NAME_DUPLICATED');
    });

    it('이름 중복은 사용자별로 판정한다', async () => {
      await createPortfolio('안전형 투자', TEST_USER_ID).expect(201);

      await createPortfolio('안전형 투자', OTHER_USER_ID).expect(201);
    });

    it('5개째 생성은 409 PORTFOLIO_LIMIT_EXCEEDED를 반환한다', async () => {
      for (const name of ['첫째', '둘째', '셋째', '넷째']) {
        await createPortfolio(name).expect(201);
      }

      const response = await createPortfolio('다섯째').expect(409);

      expect(errorOf(response).code).toBe('PORTFOLIO_LIMIT_EXCEEDED');
      await expect(
        prisma.virtualPortfolio.count({ where: { userId: TEST_USER_ID } }),
      ).resolves.toBe(4);
    });

    it('오류 응답은 data로 감싸지 않고 traceId를 포함한다', async () => {
      const response = await createPortfolio('   ').expect(400);

      expect(response.body).toEqual({
        success: false,
        code: expect.any(String) as unknown,
        message: expect.any(String) as unknown,
        traceId: expect.any(String) as unknown,
      });
    });
  });

  describe('GET /assets/portfolios', () => {
    it('가상계좌가 없어도 maxCount를 포함한다', async () => {
      const response = await getPortfolios().expect(200);

      /** 명세상 maxCount는 required다. 빈 목록에서도 빠지면 안 된다. */
      expect(dataOf<PortfolioList>(response)).toEqual({
        portfolios: [],
        maxCount: 4,
      });
    });

    it('sortOrder 오름차순으로 정렬해서 반환한다', async () => {
      for (const name of ['첫째', '둘째', '셋째']) {
        await createPortfolio(name).expect(201);
      }

      const response = await getPortfolios().expect(200);

      expect(
        dataOf<PortfolioList>(response).portfolios.map((portfolio) => [
          portfolio.name,
          portfolio.sortOrder,
        ]),
      ).toEqual([
        ['첫째', 0],
        ['둘째', 1],
        ['셋째', 2],
      ]);
    });

    it('다른 사용자의 가상계좌는 조회되지 않는다', async () => {
      await createPortfolio('내 계좌', TEST_USER_ID).expect(201);

      const response = await getPortfolios(OTHER_USER_ID).expect(200);

      expect(dataOf<PortfolioList>(response).portfolios).toEqual([]);
    });
  });

  describe('PATCH /assets/portfolios/order', () => {
    /** 이름 → id 로 만들어두면 순서를 이름으로 표현할 수 있어 읽기 쉽다. */
    const createMany = async (names: string[], userId = TEST_USER_ID) => {
      const ids: Record<string, number> = {};

      for (const name of names) {
        const response = await createPortfolio(name, userId).expect(201);
        ids[name] = dataOf<PortfolioSummary>(response).id;
      }

      return ids;
    };

    it('요청 배열의 인덱스를 그대로 sortOrder로 재할당한다', async () => {
      const ids = await createMany(['첫째', '둘째', '셋째']);

      const response = await reorderPortfolios([
        ids['셋째'],
        ids['첫째'],
        ids['둘째'],
      ]).expect(200);

      expect(
        dataOf<PortfolioList>(response).portfolios.map((portfolio) => [
          portfolio.name,
          portfolio.sortOrder,
        ]),
      ).toEqual([
        ['셋째', 0],
        ['첫째', 1],
        ['둘째', 2],
      ]);
    });

    it('응답은 목록 조회와 같은 형태다', async () => {
      const ids = await createMany(['첫째', '둘째']);

      const response = await reorderPortfolios([
        ids['둘째'],
        ids['첫째'],
      ]).expect(200);

      /** 프론트가 재조회 없이 상태를 갱신할 수 있어야 하므로 maxCount도 온다. */
      expect(dataOf<PortfolioList>(response).maxCount).toBe(4);
    });

    it('변경된 순서가 이후 목록 조회에도 반영된다', async () => {
      const ids = await createMany(['첫째', '둘째']);

      await reorderPortfolios([ids['둘째'], ids['첫째']]).expect(200);

      expect(namesInOrder(await getPortfolios().expect(200))).toEqual([
        '둘째',
        '첫째',
      ]);
    });

    it('ID가 중복되면 400 PORTFOLIO_ORDER_MISMATCH를 반환한다', async () => {
      const ids = await createMany(['첫째', '둘째']);

      const response = await reorderPortfolios([
        ids['첫째'],
        ids['첫째'],
      ]).expect(400);

      expect(errorOf(response).code).toBe('PORTFOLIO_ORDER_MISMATCH');
    });

    it('보유 계좌를 일부만 전달하면 400을 반환한다', async () => {
      const ids = await createMany(['첫째', '둘째', '셋째']);

      const response = await reorderPortfolios([ids['첫째']]).expect(400);

      expect(errorOf(response).code).toBe('PORTFOLIO_ORDER_MISMATCH');
    });

    it('다른 사용자의 가상계좌 ID가 섞이면 400을 반환한다', async () => {
      const mine = await createMany(['내 계좌'], TEST_USER_ID);
      const others = await createMany(['남의 계좌'], OTHER_USER_ID);

      const response = await reorderPortfolios([
        mine['내 계좌'],
        others['남의 계좌'],
      ]).expect(400);

      expect(errorOf(response).code).toBe('PORTFOLIO_ORDER_MISMATCH');
    });

    it('실패하면 기존 순서를 그대로 둔다', async () => {
      const ids = await createMany(['첫째', '둘째']);

      /** 개수가 어긋나므로 실패한다. 이때 첫째가 이미 갱신돼 있으면 안 된다. */
      await reorderPortfolios([ids['둘째']]).expect(400);

      expect(namesInOrder(await getPortfolios().expect(200))).toEqual([
        '첫째',
        '둘째',
      ]);
    });

    it('빈 배열은 400 BAD_REQUEST를 반환한다', async () => {
      await createPortfolio('첫째').expect(201);

      const response = await reorderPortfolios([]).expect(400);

      /** DTO 검증 단계에서 걸러지므로 도메인 코드가 아니다. */
      expect(errorOf(response).code).toBe('BAD_REQUEST');
    });

    it('정수가 아닌 값이 섞이면 400 BAD_REQUEST를 반환한다', async () => {
      await createPortfolio('첫째').expect(201);

      const response = await request(app.getHttpServer())
        .patch(`${PATH}/order`)
        .set(asUser(TEST_USER_ID))
        .send({ portfolioIds: ['abc'] })
        .expect(400);

      expect(errorOf(response).code).toBe('BAD_REQUEST');
    });

    it('다른 사용자의 순서에는 영향을 주지 않는다', async () => {
      const mine = await createMany(['내 첫째', '내 둘째'], TEST_USER_ID);
      await createMany(['남의 첫째', '남의 둘째'], OTHER_USER_ID);

      await reorderPortfolios([mine['내 둘째'], mine['내 첫째']]).expect(200);

      expect(
        namesInOrder(await getPortfolios(OTHER_USER_ID).expect(200)),
      ).toEqual(['남의 첫째', '남의 둘째']);
    });
  });

  describe('PATCH /assets/portfolios/:portfolioId', () => {
    const createOne = async (name: string, userId = TEST_USER_ID) =>
      dataOf<PortfolioSummary>(await createPortfolio(name, userId).expect(201))
        .id;

    it('이름을 변경하고 id·name·updatedAt을 반환한다', async () => {
      const id = await createOne('안전형');

      const response = await renamePortfolio(id, '공격형').expect(200);
      const updated = dataOf<PortfolioNameUpdated>(response);

      expect(updated).toMatchObject({ id, name: '공격형' });

      /** 명세는 ISO 8601 문자열이다. Date 객체가 새어나가면 안 된다. */
      expect(typeof updated.updatedAt).toBe('string');
    });

    it('sortOrder는 변경되지 않는다', async () => {
      await createPortfolio('첫째').expect(201);
      const id = await createOne('둘째');

      await renamePortfolio(id, '둘째 개명').expect(200);

      const listed = dataOf<PortfolioList>(
        await getPortfolios().expect(200),
      ).portfolios;

      expect(
        listed.map((portfolio) => [portfolio.name, portfolio.sortOrder]),
      ).toEqual([
        ['첫째', 0],
        ['둘째 개명', 1],
      ]);
    });

    it('이름 앞뒤 공백을 잘라내고 저장한다', async () => {
      const id = await createOne('안전형');

      const response = await renamePortfolio(id, '  공격형  ').expect(200);

      expect(dataOf<PortfolioNameUpdated>(response).name).toBe('공격형');
    });

    it('같은 이름으로 다시 보내도 성공한다', async () => {
      const id = await createOne('안전형');

      /** 자기 자신은 중복이 아니다. 멱등해야 한다. */
      await renamePortfolio(id, '안전형').expect(200);
    });

    it('다른 계좌가 쓰는 이름이면 409를 반환한다', async () => {
      await createPortfolio('안전형').expect(201);
      const id = await createOne('공격형');

      const response = await renamePortfolio(id, '안전형').expect(409);

      expect(errorOf(response).code).toBe('PORTFOLIO_NAME_DUPLICATED');
    });

    it('없는 계좌면 404 PORTFOLIO_NOT_FOUND를 반환한다', async () => {
      const response = await renamePortfolio(
        MISSING_PORTFOLIO_ID,
        '공격형',
      ).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('다른 사용자의 계좌면 404를 반환한다', async () => {
      const id = await createOne('남의 계좌', OTHER_USER_ID);

      /** 403으로 나누면 남의 계좌 존재 여부가 드러난다. 404로 묶는다. */
      const response = await renamePortfolio(
        id,
        '가로채기',
        TEST_USER_ID,
      ).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('공백만 있는 이름은 400을 반환한다', async () => {
      const id = await createOne('안전형');

      await renamePortfolio(id, '   ').expect(400);
    });

    it('portfolioId가 정수가 아니면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${PATH}/abc`)
        .set(asUser(TEST_USER_ID))
        .send({ name: '공격형' })
        .expect(400);

      expect(errorOf(response).code).toBe('BAD_REQUEST');
    });
  });

  describe('DELETE /assets/portfolios/:portfolioId', () => {
    const createOne = async (name: string, userId = TEST_USER_ID) =>
      dataOf<PortfolioSummary>(await createPortfolio(name, userId).expect(201))
        .id;

    it('삭제하고 id·deleted를 반환한다', async () => {
      const id = await createOne('안전형');

      const response = await deletePortfolio(id).expect(200);

      expect(dataOf<PortfolioDeleted>(response)).toEqual({ id, deleted: true });
    });

    it('삭제한 계좌는 목록에서 사라진다', async () => {
      const id = await createOne('안전형');
      await createPortfolio('공격형').expect(201);

      await deletePortfolio(id).expect(200);

      expect(namesInOrder(await getPortfolios().expect(200))).toEqual([
        '공격형',
      ]);
    });

    it('소속 종목이 있어도 삭제된다', async () => {
      const id = await createOne('안전형');

      await prisma.virtualPortfolioStock.create({
        data: {
          userId: TEST_USER_ID,
          virtualPortfolioId: id,
          stockCode: '005930',
        },
      });

      /** FK가 Restrict라 자식을 먼저 지우지 않으면 409가 난다. */
      await deletePortfolio(id).expect(200);

      await expect(
        prisma.virtualPortfolioStock.count({
          where: { virtualPortfolioId: id },
        }),
      ).resolves.toBe(0);
    });

    it('삭제 후 개수가 줄어 다시 생성할 수 있다', async () => {
      /**
       * 순차 생성이어야 한다. 동시에 만들면 개수 제한의 경쟁 상태
       * (서비스 주석 참고)에 걸려 테스트가 간헐적으로 실패한다.
       */
      const first = await createOne('첫째');
      for (const name of ['둘째', '셋째', '넷째']) {
        await createPortfolio(name).expect(201);
      }

      await createPortfolio('다섯째').expect(409);

      await deletePortfolio(first).expect(200);

      await createPortfolio('다섯째').expect(201);
    });

    it('삭제한 이름은 다시 사용할 수 있다', async () => {
      const id = await createOne('안전형');

      await deletePortfolio(id).expect(200);

      await createPortfolio('안전형').expect(201);
    });

    it('없는 계좌면 404 PORTFOLIO_NOT_FOUND를 반환한다', async () => {
      const response = await deletePortfolio(MISSING_PORTFOLIO_ID).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('다른 사용자의 계좌면 404를 반환하고 지우지 않는다', async () => {
      const id = await createOne('남의 계좌', OTHER_USER_ID);

      await deletePortfolio(id, TEST_USER_ID).expect(404);

      await expect(
        prisma.virtualPortfolio.count({ where: { id } }),
      ).resolves.toBe(1);
    });

    it('portfolioId가 정수가 아니면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .delete(`${PATH}/abc`)
        .set(asUser(TEST_USER_ID))
        .expect(400);

      expect(errorOf(response).code).toBe('BAD_REQUEST');
    });
  });

  describe('POST /assets/portfolios/:portfolioId/stocks', () => {
    const SAMSUNG = '005930';

    const createOne = async (name: string, userId = TEST_USER_ID) =>
      dataOf<PortfolioSummary>(await createPortfolio(name, userId).expect(201))
        .id;

    it('종목을 추가하고 portfolioId·stockCode·addedAt을 반환한다', async () => {
      const id = await createOne('안전형');

      const response = await addStock(id, SAMSUNG).expect(201);
      const added = dataOf<PortfolioStockAdded>(response);

      expect(added).toMatchObject({ portfolioId: id, stockCode: SAMSUNG });

      /** 명세는 ISO 8601 문자열이다. Date 객체가 새어나가면 안 된다. */
      expect(typeof added.addedAt).toBe('string');
    });

    it('같은 계좌에 같은 종목을 다시 넣으면 409 ALREADY_ADDED를 반환한다', async () => {
      const id = await createOne('안전형');
      await addStock(id, SAMSUNG).expect(201);

      const response = await addStock(id, SAMSUNG).expect(409);

      expect(errorOf(response).code).toBe('PORTFOLIO_STOCK_ALREADY_ADDED');
    });

    it('다른 계좌에 있는 종목이면 409 IN_OTHER_PORTFOLIO를 반환한다', async () => {
      const first = await createOne('안전형');
      const second = await createOne('공격형');
      await addStock(first, SAMSUNG).expect(201);

      /** 가상계좌는 실보유 종목의 분할이라 한 종목이 두 계좌에 들어갈 수 없다. */
      const response = await addStock(second, SAMSUNG).expect(409);

      expect(errorOf(response).code).toBe('PORTFOLIO_STOCK_IN_OTHER_PORTFOLIO');
    });

    it('다른 사용자는 같은 종목을 담을 수 있다', async () => {
      const mine = await createOne('내 계좌', TEST_USER_ID);
      const others = await createOne('남의 계좌', OTHER_USER_ID);

      await addStock(mine, SAMSUNG, TEST_USER_ID).expect(201);

      /** 제약이 (userId, stockCode)라 사용자가 다르면 통과해야 한다. */
      await addStock(others, SAMSUNG, OTHER_USER_ID).expect(201);
    });

    it('없는 계좌면 404 PORTFOLIO_NOT_FOUND를 반환한다', async () => {
      const response = await addStock(MISSING_PORTFOLIO_ID, SAMSUNG).expect(
        404,
      );

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('다른 사용자의 계좌면 404를 반환한다', async () => {
      const id = await createOne('남의 계좌', OTHER_USER_ID);

      const response = await addStock(id, SAMSUNG, TEST_USER_ID).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('6자리 숫자가 아닌 종목 코드는 400을 반환한다', async () => {
      const id = await createOne('안전형');

      for (const invalid of ['12345', '1234567', 'ABCDEF', '']) {
        await addStock(id, invalid).expect(400);
      }

      await expect(prisma.virtualPortfolioStock.count()).resolves.toBe(0);
    });
  });

  describe('DELETE /assets/portfolios/:portfolioId/stocks/:stockCode', () => {
    const SAMSUNG = '005930';

    const createOne = async (name: string, userId = TEST_USER_ID) =>
      dataOf<PortfolioSummary>(await createPortfolio(name, userId).expect(201))
        .id;

    it('종목을 제거하고 removed: true를 반환한다', async () => {
      const id = await createOne('안전형');
      await addStock(id, SAMSUNG).expect(201);

      const response = await removeStock(id, SAMSUNG).expect(200);

      expect(dataOf<PortfolioStockRemoved>(response)).toEqual({
        portfolioId: id,
        stockCode: SAMSUNG,
        removed: true,
      });
      await expect(prisma.virtualPortfolioStock.count()).resolves.toBe(0);
    });

    it('제거한 종목은 다른 계좌에 넣을 수 있다', async () => {
      const first = await createOne('안전형');
      const second = await createOne('공격형');
      await addStock(first, SAMSUNG).expect(201);

      await removeStock(first, SAMSUNG).expect(200);

      /** (userId, stockCode) 제약에서 풀렸는지 확인한다. */
      await addStock(second, SAMSUNG).expect(201);
    });

    it('등록되지 않은 종목이면 404 STOCK_NOT_FOUND를 반환한다', async () => {
      const id = await createOne('안전형');

      const response = await removeStock(id, SAMSUNG).expect(404);

      /** 계좌는 있으므로 PORTFOLIO_NOT_FOUND가 아니어야 한다. */
      expect(errorOf(response).code).toBe('PORTFOLIO_STOCK_NOT_FOUND');
    });

    it('없는 계좌면 404 PORTFOLIO_NOT_FOUND를 반환한다', async () => {
      const response = await removeStock(MISSING_PORTFOLIO_ID, SAMSUNG).expect(
        404,
      );

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('다른 계좌에 있는 종목은 제거되지 않는다', async () => {
      const first = await createOne('안전형');
      const second = await createOne('공격형');
      await addStock(first, SAMSUNG).expect(201);

      const response = await removeStock(second, SAMSUNG).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_STOCK_NOT_FOUND');
      await expect(prisma.virtualPortfolioStock.count()).resolves.toBe(1);
    });

    it('다른 사용자의 계좌면 404를 반환하고 지우지 않는다', async () => {
      const id = await createOne('남의 계좌', OTHER_USER_ID);
      await addStock(id, SAMSUNG, OTHER_USER_ID).expect(201);

      const response = await removeStock(id, SAMSUNG, TEST_USER_ID).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
      await expect(prisma.virtualPortfolioStock.count()).resolves.toBe(1);
    });

    /**
     * 형식 오류는 400이다. 경로 파라미터라 전역 ValidationPipe가 보지
     * 않으므로 ParseStockCodePipe가 없으면 '없는 종목' 404로 새어 나간다.
     */
    it('6자리 숫자가 아닌 종목 코드는 400을 반환한다', async () => {
      const id = await createOne('안전형');

      await removeStock(id, 'AAPL').expect(400);
      await removeStock(id, '00593').expect(400);
    });
  });

  describe('GET /assets/portfolios/:portfolioId', () => {
    /** HoldingsProvider stub에 들어 있는 종목. */
    const SAMSUNG = '005930';
    const HYNIX = '000660';
    const KAKAO = '035720';

    /** stub에 있지만 전량 매도(수량 0)로 들어 있는 종목. */
    const SOLD_OUT = '373220';

    /** stub에 아예 없는 종목. 형식은 유효하다. */
    const NOT_HELD = '123456';

    const createOne = async (name: string, userId = TEST_USER_ID) =>
      dataOf<PortfolioSummary>(await createPortfolio(name, userId).expect(201))
        .id;

    it('계좌 정보와 보유 종목을 함께 반환한다', async () => {
      const id = await createOne('안전형 투자');
      await addStock(id, SAMSUNG).expect(201);
      await addStock(id, HYNIX).expect(201);

      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(id).expect(200),
      );

      expect(detail).toMatchObject({
        id,
        name: '안전형 투자',
        sortOrder: 0,
        totalReturnRate: 8.2,
      });
      expect(detail.holdings).toEqual([
        {
          stockCode: SAMSUNG,
          stockName: '삼성전자',
          quantity: 30,
          avgBuyPrice: 68000,
          currentPrice: 72500,
          evaluationAmount: 2_175_000,
          unrealizedProfit: 135_000,
          returnRate: 6.62,
        },
        {
          stockCode: HYNIX,
          stockName: 'SK하이닉스',
          quantity: 10,
          avgBuyPrice: 180000,
          currentPrice: 198000,
          evaluationAmount: 1_980_000,
          unrealizedProfit: 180_000,
          returnRate: 10,
        },
      ]);
    });

    it('등록된 종목이 없으면 빈 holdings와 0을 반환한다', async () => {
      const id = await createOne('공격형 투자');

      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(id).expect(200),
      );

      expect(detail.holdings).toEqual([]);
      expect(detail.totalReturnRate).toBe(0);
    });

    it('등록했지만 보유하지 않는 종목은 빠진다', async () => {
      const id = await createOne('안전형');
      await addStock(id, SAMSUNG).expect(201);
      await addStock(id, NOT_HELD).expect(201);

      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(id).expect(200),
      );

      expect(detail.holdings.map((holding) => holding.stockCode)).toEqual([
        SAMSUNG,
      ]);
    });

    /** 전량 매도해도 등록은 남는다. 재매수하면 별도 조작 없이 다시 나온다. */
    it('수량이 0인 종목은 빠진다', async () => {
      const id = await createOne('안전형');
      await addStock(id, SOLD_OUT).expect(201);

      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(id).expect(200),
      );

      expect(detail.holdings).toEqual([]);
      expect(detail.totalReturnRate).toBe(0);

      /** 응답에서만 빠졌을 뿐 등록 자체는 남아 있어야 한다. */
      await expect(prisma.virtualPortfolioStock.count()).resolves.toBe(1);
    });

    it('손실 종목은 unrealizedProfit과 returnRate가 음수다', async () => {
      const id = await createOne('공격형');
      await addStock(id, KAKAO).expect(201);

      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(id).expect(200),
      );

      /** 평균단가가 정수가 아니어도 파생값은 정수로 반올림된다. */
      expect(detail.holdings[0]).toMatchObject({
        avgBuyPrice: 48500.4,
        evaluationAmount: 206_000,
        unrealizedProfit: -36_502,
        returnRate: -15.05,
      });
      expect(detail.totalReturnRate).toBe(-15.05);
    });

    /**
     * 삼성전자(+6.62%)와 카카오(-15.05%)의 단순평균은 -4.22로 음수지만,
     * 투입 금액이 8배 넘게 차이 나 금액가중으로는 +4.32다.
     */
    it('totalReturnRate는 단순평균이 아니라 금액가중이다', async () => {
      const id = await createOne('혼합형');
      await addStock(id, SAMSUNG).expect(201);
      await addStock(id, KAKAO).expect(201);

      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(id).expect(200),
      );

      expect(detail.totalReturnRate).toBe(4.32);
    });

    it('다른 계좌의 종목은 섞이지 않는다', async () => {
      const first = await createOne('안전형');
      const second = await createOne('공격형');
      await addStock(first, SAMSUNG).expect(201);
      await addStock(second, HYNIX).expect(201);

      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(first).expect(200),
      );

      expect(detail.holdings.map((holding) => holding.stockCode)).toEqual([
        SAMSUNG,
      ]);
    });

    it('sortOrder와 createdAt은 목록 조회와 같은 값이다', async () => {
      await createOne('첫째');
      const id = await createOne('둘째');

      const listed = dataOf<PortfolioList>(
        await getPortfolios().expect(200),
      ).portfolios.find((portfolio) => portfolio.id === id);
      const detail = dataOf<PortfolioDetail>(
        await getPortfolioDetail(id).expect(200),
      );

      expect(detail).toMatchObject({
        id,
        name: listed?.name,
        sortOrder: listed?.sortOrder,
        createdAt: listed?.createdAt,
      });
    });

    it('없는 계좌면 404 PORTFOLIO_NOT_FOUND를 반환한다', async () => {
      const response =
        await getPortfolioDetail(MISSING_PORTFOLIO_ID).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('다른 사용자의 계좌면 404를 반환한다', async () => {
      const id = await createOne('남의 계좌', OTHER_USER_ID);

      const response = await getPortfolioDetail(id, TEST_USER_ID).expect(404);

      expect(errorOf(response).code).toBe('PORTFOLIO_NOT_FOUND');
    });

    it('portfolioId가 정수가 아니면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .get(`${PATH}/abc`)
        .set(asUser(TEST_USER_ID))
        .expect(400);
    });
  });
});
