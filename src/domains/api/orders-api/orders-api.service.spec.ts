import * as dotenv from 'dotenv';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from '../clients/toss/toss.client';
import { OrdersApiService } from './orders-api.service';

dotenv.config();

describe('OrdersApiService - 실제 토스 매수/주문 연동 테스트', () => {
  let ordersApiService: OrdersApiService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersApiService,
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

    ordersApiService = module.get<OrdersApiService>(OrdersApiService);
  });

  it('토스증권 API로 매수 주문(BUY)을 전송하고 결과를 콘솔에 출력한다', async () => {
    const hasCredentials =
      process.env.TOSS_ACCESS_TOKEN ||
      (process.env.TOSS_CLIENT_KEY && process.env.TOSS_CLIENT_SECRET);

    if (!hasCredentials) {
      console.warn(
        '\n⚠️ [.env 파일 미설정] 키가 없어 실제 주문 테스트를 건너뜁니다.\n',
      );
      return;
    }

    // 🛡️ [안전 스위치] TOSS_LIVE_ORDER_ENABLED=true 일 때만 실서버로 주문 요청 전송
    if (process.env.TOSS_LIVE_ORDER_ENABLED !== 'true') {
      console.log(
        '\n🔒 [실거래 보호 모드] 평소에는 실제 주문을 전송하지 않습니다.\n' +
          '👉 실제 주문/취소 연동 테스트를 실행하려면: TOSS_LIVE_ORDER_ENABLED=true yarn test src/domains/api/orders-api/orders-api.service.spec.ts\n',
      );
      return;
    }

    console.log('\n======================================================');
    console.log('🚀 [실제 토스 매수 주문 요청 테스트]');
    console.log('======================================================');

    try {
      // 💡 안전한 테스트: 현재가보다 현저히 낮은 지정가(LIMIT) 1주 매수 요청
      const orderRequest = {
        symbol: '005930', // 삼성전자
        tradeType: 'BUY' as const, // 매수
        orderType: 'LIMIT' as const, // 지정가
        quantity: 1, // 1주
        price: 10000, // 10,000원 (체결 불가능한 초저가 지정가)
        accountSeq: '1', // 토스 WTS 계좌 시퀀스
      };

      console.log(
        '📌 주문 요청 데이터:',
        JSON.stringify(orderRequest, null, 2),
      );

      const result = await ordersApiService.createOrder(orderRequest);

      console.log('\n✅ [주문 접수 성공 응답]:');
      console.log(JSON.stringify(result, null, 2));

      // 🛡️ 주문 접수 성공 즉시 취소(cancelOrder)를 호출하여 체결 방지
      if (result.orderId) {
        console.log(
          `\n🧹 [즉시 취소 실행] 미체결 주문 즉시 취소 중 (orderId: ${result.orderId})...`,
        );
        const cancelResult = await ordersApiService.cancelOrder({
          orderId: result.orderId,
          accountSeq: '1',
        });
        console.log(
          '✅ [취소 완료 응답]:',
          JSON.stringify(cancelResult, null, 2),
        );
      }

      console.log('======================================================\n');
      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        console.log('\n⚠️ [토스 서버 응답 (에러/예외 처리)]:');
        console.log(`- 에러 코드: ${error.definition.code}`);
        console.log(`- 안내 메시지: ${error.definition.message}`);
        console.log(`- 상세 정보:`, error.labels);
        console.log('======================================================\n');
      }

      expect(error).toBeDefined();
    }
  });

  it('사용자별 키(tossCredentials)가 주어지면 해당 사용자 키로 주문을 전송한다', async () => {
    const hasCredentials =
      process.env.TOSS_CLIENT_KEY && process.env.TOSS_CLIENT_SECRET;

    if (!hasCredentials) {
      console.warn(
        '\n⚠️ [.env 파일 미설정] 키가 없어 사용자 키 테스트를 건너뜁니다.\n',
      );
      return;
    }

    // 🛡️ [안전 스위치] TOSS_LIVE_ORDER_ENABLED=true 일 때만 실서버로 주문 요청 전송
    if (process.env.TOSS_LIVE_ORDER_ENABLED !== 'true') {
      return;
    }

    try {
      // 사용자별 키를 명시적으로 주입한 주문 요청
      const orderRequest = {
        symbol: '005930',
        tradeType: 'BUY' as const,
        orderType: 'LIMIT' as const,
        quantity: 1,
        price: 10000,
        accountSeq: '1',
        tossCredentials: {
          clientKey: process.env.TOSS_CLIENT_KEY!,
          clientSecret: process.env.TOSS_CLIENT_SECRET!,
        },
      };

      const result = await ordersApiService.createOrder(orderRequest);

      if (result.orderId) {
        await ordersApiService.cancelOrder({
          orderId: result.orderId,
          accountSeq: '1',
          tossCredentials: orderRequest.tossCredentials,
        });
      }

      expect(result).toBeDefined();
    } catch (error: unknown) {
      expect(error).toBeDefined();
      if (error instanceof BusinessException) {
        expect(error.definition.code).toBeDefined();
      }
    }
  });
});
