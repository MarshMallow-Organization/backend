import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** StubAuthGuard가 기본으로 사용하는 사용자. 테스트마다 새로 만든다. */
export const TEST_USER_ID = 1;

/** 다른 사용자의 데이터가 섞이지 않는지 확인할 때 쓰는 두 번째 사용자. */
export const OTHER_USER_ID = 2;

/**
 * resetDatabase가 테이블을 통째로 비우므로, 개발 DB를 보고 있으면 즉시 멈춘다.
 * setupEnv.e2e.ts가 어떤 이유로든 적용되지 않았을 때의 마지막 방어선이다.
 */
const EXPECTED_DATABASE = 'cgate_test';

/**
 * main.ts와 같은 설정으로 테스트 앱을 띄운다.
 *
 * ValidationPipe를 여기서도 똑같이 걸어야 400 검증 결과가 실제 서버와 같다.
 * 전역 필터·인터셉터는 AppModule에 등록돼 있어 자동으로 따라온다.
 *
 * 주의: main.ts가 ValidationPipe를 두 번 등록하고 있고 첫 번째에
 * forbidNonWhitelisted가 없어, 실서버에서 미정의 필드가 400이 되지 않는다.
 * 여기서도 같은 설정을 재현해 테스트가 실제 동작과 어긋나지 않게 한다.
 */
export const createTestApp = async (): Promise<INestApplication<App>> => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();

  return app;
};

/**
 * 테스트 데이터를 초기화하고 기본 사용자를 만든다.
 *
 * 각 테스트가 앞선 테스트의 잔여 데이터에 의존하지 않도록 매번 비운다.
 * FK 때문에 일기·체결·주문과 포트폴리오의 자식 테이블부터 지운다.
 */
export const resetDatabase = async (prisma: PrismaService): Promise<void> => {
  if (process.env.DB_DATABASE !== EXPECTED_DATABASE) {
    throw new Error(
      `e2e는 ${EXPECTED_DATABASE}에서만 실행해야 한다. ` +
        `현재 DB_DATABASE=${process.env.DB_DATABASE ?? '(미설정)'} — ` +
        '개발 데이터가 삭제될 수 있어 중단한다.',
    );
  }

  await prisma.buyDiary.deleteMany();
  await prisma.sellDiary.deleteMany();
  await prisma.diary.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.orderCondition.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.order.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.virtualPortfolioStock.deleteMany();
  await prisma.virtualPortfolio.deleteMany();
  await prisma.favoriteStock.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        id: TEST_USER_ID,
        email: 'dev@marshmallow.local',
        name: '개발용사용자',
      },
      {
        id: OTHER_USER_ID,
        email: 'other@marshmallow.local',
        name: '다른사용자',
      },
    ],
  });
};
