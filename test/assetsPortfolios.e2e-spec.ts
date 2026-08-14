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
});
