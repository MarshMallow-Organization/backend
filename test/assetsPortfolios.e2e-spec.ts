import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  OTHER_USER_ID,
  resetDatabase,
  TEST_USER_ID,
} from './e2eApp';

/** 응답 봉투. 이슈 #24가 정한 형식이다. */
interface PortfolioData {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

interface SuccessBody {
  data: PortfolioData;
}

interface ErrorBody {
  code: string;
  message: string;
  traceId?: string;
}

interface PortfolioListData {
  portfolios: PortfolioData[];
  maxCount: number;
}

const dataOf = (response: { body: unknown }): PortfolioData =>
  (response.body as SuccessBody).data;

const listOf = (response: { body: unknown }): PortfolioListData =>
  (response.body as { data: PortfolioListData }).data;

const errorOf = (response: { body: unknown }): ErrorBody =>
  response.body as ErrorBody;

/** 인증 스텁이 읽는 헤더. 실제 JWT가 붙으면 Authorization으로 바뀐다. */
const asUser = (userId: number) => ['x-stub-user-id', String(userId)] as const;

describe('POST /assets/portfolios (가상계좌 생성)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (body: unknown, userId = TEST_USER_ID) =>
    request(app.getHttpServer() as App)
      .post('/assets/portfolios')
      .set(...asUser(userId))
      .send(body);

  it('가상계좌를 생성하고 201로 응답한다', async () => {
    const response = await post({ name: '안전형 투자' }).expect(201);

    expect(dataOf(response)).toMatchObject({
      name: '안전형 투자',
      sortOrder: 1,
    });
    expect(dataOf(response).id).toEqual(expect.any(Number));
    expect(dataOf(response).createdAt).toEqual(expect.any(String));
  });

  it('생성한 가상계좌가 요청한 사용자 소유로 저장된다', async () => {
    const response = await post({ name: '안전형 투자' }).expect(201);

    const saved = await prisma.virtualPortfolio.findUnique({
      where: { id: dataOf(response).id },
    });

    expect(saved?.userId).toBe(TEST_USER_ID);
  });

  /** 명세: sortOrder를 최대값 + 1로 설정한다. */
  it('sortOrder를 기존 최대값 + 1로 매긴다', async () => {
    await post({ name: '첫번째' }).expect(201);
    const second = await post({ name: '두번째' }).expect(201);

    expect(dataOf(second).sortOrder).toBe(2);
  });

  it('이름이 없으면 400을 반환한다', async () => {
    const response = await post({}).expect(400);

    expect(errorOf(response).code).toBe('BAD_REQUEST');
  });

  it('이름이 빈 문자열이면 400을 반환한다', async () => {
    await post({ name: '' }).expect(400);
  });

  /** UNIQUE(user_id, name) → 같은 사용자만 충돌한다. */
  it('같은 사용자가 같은 이름으로 또 만들면 409를 반환한다', async () => {
    await post({ name: '안전형 투자' }).expect(201);

    const response = await post({ name: '안전형 투자' }).expect(409);

    expect(errorOf(response).code).toBe('PORTFOLIO_NAME_DUPLICATED');
  });

  it('다른 사용자는 같은 이름으로 만들 수 있다', async () => {
    await post({ name: '안전형 투자' }, TEST_USER_ID).expect(201);

    await post({ name: '안전형 투자' }, OTHER_USER_ID).expect(201);
  });

  /** 명세: 사용자의 가상계좌 개수가 4개 미만인지 확인한다. */
  it('가상계좌가 이미 4개면 409를 반환한다', async () => {
    for (const name of ['1번', '2번', '3번', '4번']) {
      await post({ name }).expect(201);
    }

    const response = await post({ name: '5번' }).expect(409);

    expect(errorOf(response).code).toBe('PORTFOLIO_LIMIT_EXCEEDED');
  });

  it('스텁 인증 헤더가 잘못되면 401을 반환한다', async () => {
    await request(app.getHttpServer() as App)
      .post('/assets/portfolios')
      .set('x-stub-user-id', 'not-a-number')
      .send({ name: '안전형 투자' })
      .expect(401);
  });
});

describe('GET /assets/portfolios (가상계좌 목록 조회)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (userId = TEST_USER_ID) =>
    request(app.getHttpServer() as App)
      .get('/assets/portfolios')
      .set(...asUser(userId));

  const seed = (userId: number, name: string, sortOrder: number) =>
    prisma.virtualPortfolio.create({ data: { userId, name, sortOrder } });

  it('가상계좌가 없으면 빈 배열을 반환한다', async () => {
    const response = await get().expect(200);

    expect(listOf(response).portfolios).toEqual([]);
  });

  it('생성 가능한 최대 개수를 함께 내려준다', async () => {
    const response = await get().expect(200);

    expect(listOf(response).maxCount).toBe(4);
  });

  it('가상계좌 기본 정보를 반환한다', async () => {
    await seed(TEST_USER_ID, '안전형 투자', 1);

    const response = await get().expect(200);

    expect(listOf(response).portfolios).toHaveLength(1);
    expect(listOf(response).portfolios[0]).toMatchObject({
      name: '안전형 투자',
      sortOrder: 1,
    });
  });

  /** 명세: holdings는 목록 조회에 포함하지 않는다. */
  it('holdings는 포함하지 않는다', async () => {
    await seed(TEST_USER_ID, '안전형 투자', 1);

    const response = await get().expect(200);

    expect(listOf(response).portfolios[0]).not.toHaveProperty('holdings');
  });

  /** 명세: sortOrder 오름차순, 같으면 id 오름차순. */
  it('sortOrder 오름차순으로 정렬한다', async () => {
    await seed(TEST_USER_ID, '세번째', 3);
    await seed(TEST_USER_ID, '첫번째', 1);
    await seed(TEST_USER_ID, '두번째', 2);

    const response = await get().expect(200);

    expect(listOf(response).portfolios.map((p) => p.name)).toEqual([
      '첫번째',
      '두번째',
      '세번째',
    ]);
  });

  it('sortOrder가 같으면 id 오름차순으로 정렬한다', async () => {
    const first = await seed(TEST_USER_ID, 'A', 1);
    const second = await seed(TEST_USER_ID, 'B', 1);

    const response = await get().expect(200);

    expect(listOf(response).portfolios.map((p) => p.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it('다른 사용자의 가상계좌는 조회되지 않는다', async () => {
    await seed(OTHER_USER_ID, '남의 계좌', 1);
    await seed(TEST_USER_ID, '내 계좌', 1);

    const response = await get().expect(200);

    expect(listOf(response).portfolios.map((p) => p.name)).toEqual(['내 계좌']);
  });

  it('스텁 인증 헤더가 잘못되면 401을 반환한다', async () => {
    await request(app.getHttpServer() as App)
      .get('/assets/portfolios')
      .set('x-stub-user-id', 'not-a-number')
      .expect(401);
  });
});
