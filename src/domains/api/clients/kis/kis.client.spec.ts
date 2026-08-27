import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KisClient } from './kis.client';
import { KisStockPrice1Response } from './kis.types';
import * as dotenv from 'dotenv';

dotenv.config();

describe('KisClient', () => {
  let client: KisClient;

  beforeAll(async () => {
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

  it('KisClient 인스턴스가 정상적으로 생성된다', () => {
    expect(client).toBeDefined();
    expect(client.getWebSocketUrl()).toBe('ws://ops.koreainvestment.com:21000');
  });

  it('client.request()를 통해 실제 KIS API에서 주식 현재가 시세1을 조회한다', async () => {
    const hasCredentials =
      process.env.KIS_ACCESS_TOKEN ||
      (process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);

    if (!hasCredentials) {
      console.warn(
        '\n⚠️ [.env 파일 미설정] KIS_APP_KEY/SECRET 또는 KIS_ACCESS_TOKEN이 없어 실제 API 호출을 건너뜁니다.\n',
      );
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

    console.log('\n======================================================');
    console.log('🚀 [실제 KIS API request() 호출] 삼성전자(005930) 시세1 조회');
    console.log('======================================================');

    const stockCode = '005930';
    const response = await client.request<KisStockPrice1Response>(
      `/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`,
      {
        method: 'GET',
        trId: 'FHKST01010100', // 주식현재가 시세1
      },
    );

    console.log('\n✅ [KIS API 응답 결과]:');
    console.log(JSON.stringify(response, null, 2));
    console.log('======================================================\n');

    expect(response).toBeDefined();
    expect(response.rt_cd).toBe('0');
    expect(response.output).toBeDefined();
    expect(response.output?.stck_prpr).toBeDefined();
  });

  it('client.getApprovalKey()를 통해 실시간 웹소켓 접속키를 발급받는다', async () => {
    const hasCredentials =
      process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET;

    if (!hasCredentials) {
      console.warn(
        '\n⚠️ [.env 파일 미설정] KIS_APP_KEY/SECRET이 없어 웹소켓 접속키 발급 테스트를 건너뜁니다.\n',
      );
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

    console.log('\n======================================================');
    console.log('🚀 [실제 KIS Approval Key 발급 요청]');
    console.log('======================================================');

    const approvalKey = await client.getApprovalKey();

    console.log(
      '\n✅ [Approval Key 발급 결과]:',
      approvalKey ? `${approvalKey.slice(0, 10)}... (정상 발급)` : '실패',
    );
    console.log('======================================================\n');

    expect(approvalKey).toBeDefined();
    expect(typeof approvalKey).toBe('string');
    expect(approvalKey.length).toBeGreaterThan(0);
  });
});
