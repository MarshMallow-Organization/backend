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

const dataOf = (response: { body: unknown }): PortfolioData =>
  (response.body as SuccessBody).data;

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
