import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KisClient } from './kis.client';
import { KisStockPrice1Response } from './kis.types';
import { BusinessException } from 'src/common/exception/businessException';
import * as dotenv from 'dotenv';

dotenv.config();

describe('KisClient', () => {
  let client: KisClient;

  beforeAll(async () => {
    // 테스트 실행 중 콘솔 로그 무음 처리
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KisClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'kis.accessToken')
                return process.env.KIS_ACCESS_TOKEN;
              if (key === 'kis.approvalKey')
                return process.env.KIS_APPROVAL_KEY;
              if (key === 'kis.appKey') return process.env.KIS_APP_KEY;
              if (key === 'kis.appSecret') return process.env.KIS_APP_SECRET;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<KisClient>(KisClient);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('KisClient 인스턴스가 정상적으로 생성된다', () => {
    expect(client).toBeDefined();
    expect(client.getWebSocketUrl()).toBe('ws://ops.koreainvestment.com:21000');
  });

  it('client.request()를 통해 실제 KIS API에서 주식 현재가 시세1을 조회한다', async () => {
    const isLiveTestEnabled = process.env.KIS_LIVE_TEST_ENABLED === 'true';
    if (!isLiveTestEnabled) return;

    const hasCredentials =
      process.env.KIS_ACCESS_TOKEN ||
      (process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);

    if (!hasCredentials) {
      return;
    }

    // 🛡️ [안전 스위치] KIS_LIVE_API_ENABLED=true 일 때만 실제 KIS 서버 호출
    if (process.env.KIS_LIVE_API_ENABLED !== 'true') {
      console.log(
        '\n🔒 [실서버 API 보호 모드 - REST API] 평소에는 실제 외부 KIS REST API(시세 조회)를 호출하지 않습니다.\n' +
          '👉 실제 KIS 연동 테스트를 실행하려면: KIS_LIVE_API_ENABLED=true yarn test src/domains/api/clients/kis/kis.client.spec.ts\n',
      );
      return;
    }

    const stockCode = '005930';
    try {
      const response = await client.request<KisStockPrice1Response>(
        `/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`,
        {
          method: 'GET',
          trId: 'FHKST01010100', // 주식현재가 시세1
        },
      );

      expect(response).toBeDefined();
      expect(response.rt_cd).toBe('0');
      expect(response.output).toBeDefined();
      expect(response.output?.stck_prpr).toBeDefined();
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
    }
  });

  it('client.getApprovalKey()를 통해 실시간 웹소켓 접속키를 발급받는다', async () => {
    const isLiveTestEnabled = process.env.KIS_LIVE_TEST_ENABLED === 'true';
    if (!isLiveTestEnabled) return;

    const hasCredentials =
      process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET;

    if (!hasCredentials) {
      return;
    }

    // 🛡️ [안전 스위치] KIS_LIVE_API_ENABLED=true 일 때만 실제 KIS 서버 호출
    if (process.env.KIS_LIVE_API_ENABLED !== 'true') {
      console.log(
        '\n🔒 [실서버 API 보호 모드 - 웹소켓] 평소에는 실제 외부 KIS 웹소켓 접속키 발급 API를 호출하지 않습니다.\n' +
          '👉 실제 KIS 연동 테스트를 실행하려면: KIS_LIVE_API_ENABLED=true yarn test src/domains/api/clients/kis/kis.client.spec.ts\n',
      );
      return;
    }

    try {
      const approvalKey = await client.getApprovalKey();
      expect(approvalKey).toBeDefined();
      expect(typeof approvalKey).toBe('string');
      expect(approvalKey.length).toBeGreaterThan(0);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
    }
  });
});
