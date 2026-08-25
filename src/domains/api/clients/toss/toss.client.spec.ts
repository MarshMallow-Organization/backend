import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TossClient } from './toss.client';
import { BusinessException } from 'src/common/exception/businessException';
import * as dotenv from 'dotenv';
import { TossStockResponse } from './toss.types';

dotenv.config();

describe('TossClient', () => {
  let client: TossClient;

  beforeAll(async () => {
    // 테스트 실행 중 콘솔 로그 무음 처리
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TossClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'toss.accessToken') return process.env.TOSS_ACCESS_TOKEN;
              if (key === 'toss.clientKey') return process.env.TOSS_CLIENT_KEY;
              if (key === 'toss.clientSecret') return process.env.TOSS_CLIENT_SECRET;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<TossClient>(TossClient);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('TossClient 인스턴스가 정상적으로 생성된다', () => {
    expect(client).toBeDefined();
  });

  it('client.request()를 통해 실제 토스 API에서 종목 정보를 조회하거나 에러 응답을 수신한다', async () => {
    const hasCredentials =
      process.env.TOSS_ACCESS_TOKEN ||
      (process.env.TOSS_CLIENT_KEY && process.env.TOSS_CLIENT_SECRET);

    if (!hasCredentials) {
      return;
    }

    // 🛡️ [안전 스위치] TOSS_LIVE_API_ENABLED=true 일 때만 실제 토스 서버 호출
    if (process.env.TOSS_LIVE_API_ENABLED !== 'true') {
      console.log(
        '\n🔒 [실서버 API 보호 모드] 평소에는 실제 외부 API를 호출하지 않습니다.\n' +
          '👉 실제 토스 연동 테스트를 실행하려면: TOSS_LIVE_API_ENABLED=true yarn test src/domains/api/clients/toss/toss.client.spec.ts\n',
      );
      return;
    }

    const stockCode = '005930';
    try {
      const response = await client.request<TossStockResponse>(
        `/stocks?symbols=${stockCode}`,
        { method: 'GET' },
      );

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(Array.isArray(response.result)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
    }
  });
});
