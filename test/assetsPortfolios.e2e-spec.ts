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

    const namesInOrder = (response: request.Response) =>
      dataOf<PortfolioList>(response).portfolios.map(
        (portfolio) => portfolio.name,
      );

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
});
