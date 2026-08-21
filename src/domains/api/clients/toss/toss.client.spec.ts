import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TossClient } from './toss.client';

describe('TossClient', () => {
  describe('MOCK 모드 테스트 (토큰이 없는 경우)', () => {
    let client: TossClient;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TossClient,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'toss.accessToken') return undefined; // 토큰 없음
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      client = module.get<TossClient>(TossClient);
    });

    it('사전 정의된 삼성전자(005930) Mock 데이터를 반환한다', async () => {
      const response = await client.getStock('005930');
      expect(response.result).toHaveLength(1);
      expect(response.result[0].symbol).toBe('005930');
      expect(response.result[0].name).toBe('삼성전자');
    });

    it('존재하지 않는 코드(INVALID) 조회 시 빈 result 배열을 반환한다', async () => {
      const response = await client.getStock('INVALID');
      expect(response.result).toHaveLength(0);
    });

    it('임의의 종목 코드로 조회 시 모의 종목 데이터를 동적으로 생성해 반환한다', async () => {
      const response = await client.getStock('123456');
      expect(response.result).toHaveLength(1);
      expect(response.result[0].symbol).toBe('123456');
      expect(response.result[0].name).toBe('모의종목_123456');
    });

    it('getRanking 호출 시 모의 랭킹 목록을 반환한다', async () => {
      const response = await client.getRanking();
      expect(response.length).toBeGreaterThan(0);
    });
  });
});
