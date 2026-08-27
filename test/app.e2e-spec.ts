import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  /** 전역 ResponseInterceptor가 모든 성공 응답을 { success, code, message, data }로 감싼다. */
  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      success: true,
      code: '200',
      message: '요청에 성공하였습니다.',
      data: 'Hello World!',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
