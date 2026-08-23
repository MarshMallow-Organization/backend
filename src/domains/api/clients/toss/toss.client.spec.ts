import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TossClient } from './toss.client';

import * as dotenv from 'dotenv';
import { TossStockResponse } from './toss.types';

dotenv.config();

describe('TossClient', () => {
  let client: TossClient;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TossClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'toss.accessToken')
                return process.env.TOSS_ACCESS_TOKEN;
              if (key === 'toss.clientKey') return process.env.TOSS_CLIENT_KEY;
              if (key === 'toss.clientSecret')
                return process.env.TOSS_CLIENT_SECRET;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<TossClient>(TossClient);
  });

  it('client.request()를 통해 실제 토스 API에서 종목 정보를 조회하고 결과를 출력한다', async () => {
    const hasCredentials =
      process.env.TOSS_ACCESS_TOKEN ||
      (process.env.TOSS_CLIENT_KEY && process.env.TOSS_CLIENT_SECRET);

    if (!hasCredentials) {
      console.warn(
        '\n⚠️ [.env 파일 미설정] TOSS_CLIENT_KEY/SECRET 또는 TOSS_ACCESS_TOKEN이 없어 실제 API 호출을 건너뜁니다.\n',
      );
      return;
    }

    console.log('\n======================================================');
    console.log('🚀 [실제 토스 API request() 호출] 삼성전자(005930) 조회');
    console.log('======================================================');

    const stockCode = '005930';
    const response = await client.request<TossStockResponse>(
      `/stocks?symbols=${stockCode}`,
      { method: 'GET' },
    );

    console.log('\n✅ [토스 API 응답 결과]:');
    console.log(JSON.stringify(response, null, 2));
    console.log('======================================================\n');

    expect(response).toBeDefined();
    expect(response.result).toBeDefined();
    expect(Array.isArray(response.result)).toBe(true);
    expect(response.result.length).toBeGreaterThan(0);
    expect(response.result[0].symbol).toBe('005930');
    expect(response.result[0].name).toBe('삼성전자');
  });
});
