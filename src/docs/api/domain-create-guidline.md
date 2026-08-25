# API 도메인 신규 연동 가이드라인 (3-Layer Architecture)

API 도메인(`src/domains/api`)은 외부 금융기관 및 증권사(토스증권, 한국투자증권 등)의 OpenAPI와의 통신을 전담하는 공통 도메인입니다.
내부 도메인과의 결합도를 최소화하고, 토큰 관리, 에러 가공, 보안 및 트래킹을 일원화하는 **어댑터(Adapter) 기반 3계층 아키텍처**를 제공합니다.

---

## 1. 아키텍처 계층별 역할

1. **내부 도메인 서비스 (Domain Service)**:
   - 순수 비즈니스 로직 처리 (예: `OrdersService`, `MarketsService`)
   - API 어댑터 서비스를 주입받아 주문 생성, 시세 조회, 조건 감시 등의 비즈니스 흐름을 제어합니다.
2. **API 어댑터 (API Adapter Service)**:
   - 외부 API의 Request/Response 스펙을 내부 비즈니스 DTO로 변환하고 인터페이스를 추상화합니다 (예: `OrdersApiService`, `StocksApiService`, `OrdersWatcherService`).
3. **공통 통신 엔진 (Client Engine)**:
   - OAuth2 토큰 발급/캐싱/재발급, 웹소켓 Approval Key 발급, 인증 헤더 자동 주입, 통신 에러 Envelope 파싱 및 표준 예외 변환 (`TossClient`, `KisClient`).

---

## 2. 📖 REST API 신규 연동 4단계 가이드 (시세/종목 도메인 예시)

타 도메인(예: `markets`, `trades`, `assets` 등)에서 새로운 외부 REST API(종목 시세, 체결 내역 등)를 연동할 때 아래 4단계를 따라 구현합니다.

---

### Step 1. `src/domains/api/` 하위에 도메인 API 모듈 폴더 및 DTO/서비스 생성

예시: `src/domains/api/stocks-api/`

#### 1) DTO 정의 (`stocks-api.dto.ts`)
```typescript
// src/domains/api/stocks-api/stocks-api.dto.ts
export interface StockInfoResponseDto {
  symbol: string;
  price?: number;
  per?: number;
  pbr?: number;
  marketCap?: number;
  market?: string;
}
```

#### 2) 어댑터 서비스 구현 (`stocks-api.service.ts`)
```typescript
// src/domains/api/stocks-api/stocks-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { KisClient } from '../clients/kis/kis.client';
import { KisStockPrice1Response } from '../clients/kis/kis.types';
import { StockInfoResponseDto } from './stocks-api.dto';

@Injectable()
export class StocksApiService {
  private readonly logger = new Logger(StocksApiService.name);

  constructor(private readonly kisClient: KisClient) {}

  /**
   * KIS 주식 현재가 시세 정보 조회 (PER, PBR, 현재가 등)
   */
  async getStock(stockCode: string): Promise<StockInfoResponseDto> {
    this.logger.log(`[StocksApiService] 종목 조회 요청: ${stockCode}`);

    // 💡 kisClient.request()가 토큰 발급, 공통 헤더 주입, 401 재시도, 에러 파싱을 자동 처리
    const rawResponse = await this.kisClient.request<KisStockPrice1Response>(
      `/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`,
      {
        method: 'GET',
        trId: 'FHKST01010100', // 주식현재가 시세1
      },
    );

    const output = rawResponse.output;
    return {
      symbol: stockCode,
      price: output?.stck_prpr ? Number(output.stck_prpr) : undefined,
      per: output?.per ? Number(output.per) : undefined,
      pbr: output?.pbr ? Number(output.pbr) : undefined,
      marketCap: output?.hts_avls ? Number(output.hts_avls) : undefined,
      market: output?.rprs_mrkt_kor_name,
    };
  }
}
```

---

### Step 2. `ApiModule`에 Provider 등록 및 Export

```typescript
// src/domains/api/api.module.ts
import { Module } from '@nestjs/common';
import { TossClient } from './clients/toss/toss.client';
import { KisClient } from './clients/kis/kis.client';
import { OrdersApiService } from './orders-api/services/orders-api.service';
import { OrdersWatcherService } from './orders-api/services/orders-watcher.service';
import { StocksApiService } from './stocks-api/stocks-api.service'; // 👈 추가

@Module({
  providers: [TossClient, KisClient, OrdersApiService, OrdersWatcherService, StocksApiService],
  exports: [TossClient, KisClient, OrdersApiService, OrdersWatcherService, StocksApiService], // 👈 export
})
export class ApiModule {}
```

---

### Step 3. 사용 도메인의 모듈에서 `ApiModule` Import

```typescript
// src/domains/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { ApiModule } from 'src/domains/api/api.module'; // 👈 import
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [ApiModule], // 👈 ApiModule 등록
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

---

### Step 4. 도메인 서비스에서 주입받아 사용

```typescript
// src/domains/orders/services/orders.service.ts
import { Injectable } from '@nestjs/common';
import { StocksApiService } from 'src/domains/api/stocks-api/stocks-api.service';
import { CreateOrderDto } from '../dto/request/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly stocksApiService: StocksApiService, // 👈 의존성 주입
  ) {}

  async createOrder(userId: number, dto: CreateOrderDto) {
    // 주문 생성 시 KIS 시세를 조회하여 PER, PBR, 시가총액을 자동으로 채움
    const stockInfo = await this.stocksApiService.getStock(dto.corpCode);
    dto.perAtOrder = stockInfo.per;
    dto.pbrAtOrder = stockInfo.pbr;
    dto.marketCapAtOrder = stockInfo.marketCap;

    return await this.ordersRepository.create(userId, dto);
  }
}
```

---

## 3. ⚡ 실시간 웹소켓(WebSocket) 연동 가이드 (조건부 주문 감시 예시)

실시간 시세 스트림(Tick 데이터)이나 조건부 주문의 목표가(`target_price`) 실시간 감시가 필요한 경우, `KisClient`의 웹소켓 접속키(`Approval Key`)와 웹소켓 URL을 주입받아 구현합니다.

---

### Step 1. 웹소켓 시세 어댑터 구현 (`OrdersWatcherService`)
`src/domains/api/orders-api/services/orders-watcher.service.ts`에 KIS 웹소켓 연결, 종목 구독/해제, 실시간 틱 데이터 파싱 및 리스너 브로드캐스트 로직을 작성합니다.

```typescript
// src/domains/api/orders-api/services/orders-watcher.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KisClient } from '../../clients/kis/kis.client';
import { KisRealtimePriceWebSocketRequest, KisRealtimePriceResponse } from '../../clients/kis/kis.types';

export type PriceUpdateListener = (data: KisRealtimePriceResponse) => void | Promise<void>;

@Injectable()
export class OrdersWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersWatcherService.name);
  private ws: WebSocket | null = null;
  private subscribedSymbols = new Map<string, number>();
  private listeners: PriceUpdateListener[] = [];

  constructor(private readonly kisClient: KisClient) {}

  async onModuleInit() {
    await this.connectWebSocket();
  }

  onModuleDestroy() {
    this.ws?.close();
  }

  onPriceUpdate(listener: PriceUpdateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async connectWebSocket() {
    const wsUrl = this.kisClient.getWebSocketUrl();
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.logger.log('✅ KIS 실시간 웹소켓 연결 성공');
      for (const symbol of this.subscribedSymbols.keys()) {
        this.sendPacket(symbol, '1');
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data?.toString() ?? '');
    };
  }

  async subscribe(symbol: string) {
    const count = this.subscribedSymbols.get(symbol) ?? 0;
    this.subscribedSymbols.set(symbol, count + 1);
    if (count === 0) await this.sendPacket(symbol, '1');
  }

  async unsubscribe(symbol: string) {
    const count = this.subscribedSymbols.get(symbol) ?? 0;
    if (count <= 1) {
      this.subscribedSymbols.delete(symbol);
      await this.sendPacket(symbol, '2');
    } else {
      this.subscribedSymbols.set(symbol, count - 1);
    }
  }

  private async sendPacket(symbol: string, trType: '1' | '2') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const approvalKey = await this.kisClient.getApprovalKey();
    this.ws.send(JSON.stringify({
      header: { approval_key: approvalKey, custtype: 'P', tr_type: trType, 'content-type': 'utf-8' },
      body: { input: { tr_id: 'H0STCNT0', tr_key: symbol } },
    }));
  }

  private handleMessage(rawMessage: string) {
    if (!rawMessage || rawMessage.startsWith('{')) return;
    const parts = rawMessage.split('|');
    if (parts.length >= 4 && parts[1] === 'H0STCNT0') {
      const fields = parts[3].split('^');
      const priceData: KisRealtimePriceResponse = {
        symbol: fields[0],
        time: fields[1],
        currentPrice: Number(fields[2]) || 0,
        sign: fields[3],
        change: Number(fields[4]) || 0,
        changeRate: Number(fields[5]) || 0,
        openPrice: Number(fields[7]) || 0,
        highPrice: Number(fields[8]) || 0,
        lowPrice: Number(fields[9]) || 0,
        volume: Number(fields[12]) || 0,
        accumulatedVolume: Number(fields[13]) || 0,
        accumulatedAmount: Number(fields[14]) || 0,
      };
      for (const listener of this.listeners) listener(priceData);
    }
  }
}
```

---

### Step 2. `ApiModule`에 Provider 등록 및 Export

```typescript
// src/domains/api/api.module.ts
import { Module } from '@nestjs/common';
import { TossClient } from './clients/toss/toss.client';
import { KisClient } from './clients/kis/kis.client';
import { OrdersApiService } from './orders-api/services/orders-api.service';
import { OrdersWatcherService } from './orders-api/services/orders-watcher.service'; // 👈 추가

@Module({
  providers: [TossClient, KisClient, OrdersApiService, OrdersWatcherService],
  exports: [TossClient, KisClient, OrdersApiService, OrdersWatcherService], // 👈 export
})
export class ApiModule {}
```

---

### Step 3. `OrdersService`에서 실시간 시세 수신 및 조건부 주문 집행 (비즈니스 도메인)

```typescript
// src/domains/orders/services/orders.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { OrdersWatcherService } from 'src/domains/api/orders-api/services/orders-watcher.service';
import { OrdersApiService } from 'src/domains/api/orders-api/services/orders-api.service';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    private readonly ordersWatcherService: OrdersWatcherService, // 👈 웹소켓 어댑터 주입
    private readonly ordersApiService: OrdersApiService, // 👈 토스 주문 어댑터 주입
    private readonly ordersRepository: OrdersRepository,
  ) {}

  onModuleInit() {
    // 💡 실시간 체결가 수신 리스너 등록 -> 목표가 도달 시 토스 주문 전송 및 DB 상태 갱신
    this.ordersWatcherService.onPriceUpdate(async (tick) => {
      // 1. tick.symbol에 해당하는 PENDING 상태의 조건부 주문 조회
      // 2. tick.currentPrice와 triggerPrice 비교 후 목표가 도달 시:
      //    await this.ordersApiService.createOrder(...) 호출
      //    await this.ordersRepository.updateStatus(orderId, 'FILLED')
      //    await this.ordersWatcherService.unsubscribe(tick.symbol)
    });
  }
}
```

---

## 4. 공통 클라이언트 엔진 사양 문서
- **한국투자증권(KIS) 클라이언트**: [`docs/api/kis.md`](file:///home/joshywoshy/MarshMallow/backend/src/docs/api/kis.md)
- **토스증권(Toss) 클라이언트**: [`docs/api/toss.md`](file:///home/joshywoshy/MarshMallow/backend/src/docs/api/toss.md)
