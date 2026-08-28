import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KisClient } from '../../clients/kis/kis.client';
import {
  KisRealtimePriceWebSocketRequest,
  KisRealtimePriceResponse,
} from '../../clients/kis/kis.types';

export type PriceUpdateListener = (
  data: KisRealtimePriceResponse,
) => void | Promise<void>;

/**
 * OrdersWatcherService (API 어댑터 계층)
 * - KIS 실시간 웹소켓(H0STCNT0)과의 연결, 종목 구독 패킷 송수신, 실시간 체결가 파싱 및 브로드캐스트를 담당하는 순수 시세 어댑터입니다.
 * - 비즈니스 판단(목표가 비교, DB 상태 전이, 주문 집행)은 이 서비스를 구독하는 `domains/orders` 도메인이 수행합니다.
 */
@Injectable()
export class OrdersWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersWatcherService.name);

  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // 현재 구독 중인 종목코드 집합 (참조 카운트 관리용)
  private subscribedSymbols = new Map<string, number>();

  // 실시간 체결가 수신 리스너 콜백 목록
  private listeners: PriceUpdateListener[] = [];

  constructor(
    private readonly kisClient: KisClient,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // domains/orders와 배선되기 전까지는 KIS_WS_ENABLED=true일 때만 연결한다.
    // (유휴 소켓이 KIS 실전 서버에 무한 재접속하는 것을 막기 위함)
    if (!this.configService.get<boolean>('kis.wsEnabled')) {
      this.logger.log(
        '[OrdersWatcherService] KIS_WS_ENABLED 미설정 → 실시간 웹소켓 자동 연결을 건너뜁니다.',
      );
      return;
    }
    this.connectWebSocket();
  }

  onModuleDestroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 실시간 체결가 수신 이벤트 리스너를 등록합니다.
   * (domains/orders 도메인에서 목표가 감시를 위해 등록)
   */
  onPriceUpdate(listener: PriceUpdateListener): () => void {
    this.listeners.push(listener);
    // 리스너 해제 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * KIS 실시간 웹소켓 서버에 연결합니다.
   */
  connectWebSocket(): void {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = this.kisClient.getWebSocketUrl();

    try {
      this.logger.log(
        `[OrdersWatcherService] KIS 실시간 웹소켓 연결 중 (${wsUrl})...`,
      );
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.logger.log(
          '✅ [OrdersWatcherService] KIS 실시간 웹소켓 연결 성공',
        );

        // 연결(또는 재연결) 시 기존에 구독 중이던 종목들 다시 구독 패킷 전송
        for (const symbol of this.subscribedSymbols.keys()) {
          void this.sendPacket(symbol, '1');
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          this.handleMessage(event.data);
        } else if (event.data instanceof Buffer) {
          this.handleMessage(event.data.toString('utf-8'));
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.logger.warn(
          '⚠️ [OrdersWatcherService] KIS 웹소켓 연결 종료. 5초 후 자동 재연결합니다.',
        );
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        this.logger.error(
          '❌ [OrdersWatcherService] KIS 웹소켓 에러 발생:',
          error,
        );
      };
    } catch (err) {
      this.isConnecting = false;
      this.logger.error('[OrdersWatcherService] 웹소켓 초기화 오류:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 5000);
  }

  /**
   * 특정 종목의 실시간 시세(체결가 H0STCNT0) 구독을 등록합니다.
   */
  async subscribe(symbol: string) {
    const currentCount = this.subscribedSymbols.get(symbol) ?? 0;
    this.subscribedSymbols.set(symbol, currentCount + 1);

    // 해당 종목의 첫 구독인 경우 KIS 웹소켓 서버로 구독 패킷 전송
    if (currentCount === 0) {
      await this.sendPacket(symbol, '1');
      this.logger.log(
        `[OrdersWatcherService] 종목 실시간 체결가 구독 등록: ${symbol}`,
      );
    }
  }

  /**
   * 특정 종목의 실시간 시세 구독을 해제합니다.
   */
  async unsubscribe(symbol: string) {
    const currentCount = this.subscribedSymbols.get(symbol) ?? 0;
    if (currentCount <= 1) {
      this.subscribedSymbols.delete(symbol);
      await this.sendPacket(symbol, '2'); // KIS 서버로 구독 해제 패킷 전송
      this.logger.log(
        `[OrdersWatcherService] 종목 실시간 체결가 구독 해제: ${symbol}`,
      );
    } else {
      this.subscribedSymbols.set(symbol, currentCount - 1);
    }
  }

  /**
   * KIS 웹소켓 구독(1) / 해제(2) 패킷 전송
   */
  private async sendPacket(symbol: string, trType: '1' | '2') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const approvalKey = await this.kisClient.getApprovalKey();
      const packet: KisRealtimePriceWebSocketRequest = {
        header: {
          approval_key: approvalKey,
          custtype: 'P',
          tr_type: trType,
          'content-type': 'utf-8',
        },
        body: {
          input: {
            tr_id: 'H0STCNT0',
            tr_key: symbol,
          },
        },
      };

      this.ws.send(JSON.stringify(packet));
    } catch (error) {
      this.logger.error(
        `[OrdersWatcherService] 패킷 전송 실패 (종목: ${symbol}):`,
        error,
      );
    }
  }

  /**
   * 수신된 실시간 텍스트 패킷 파싱 후 등록된 리스너들에게 브로드캐스트
   */
  private handleMessage(rawMessage: string) {
    if (!rawMessage || rawMessage.startsWith('{')) {
      return; // PING/PONG 및 JSON 제어 메시지 건너뜀
    }

    // 포맷: 0|H0STCNT0|001|005930^123456^70000^2^1000^...
    const parts = rawMessage.split('|');
    if (parts.length < 4 || parts[1] !== 'H0STCNT0') {
      return;
    }

    const fields = parts[3].split('^');
    if (fields.length < 15) {
      return;
    }

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

    if (!priceData.symbol || priceData.currentPrice <= 0) {
      return;
    }

    // 리스너들에게 실시간 시세 데이터 전달
    for (const listener of this.listeners) {
      try {
        void listener(priceData);
      } catch (err) {
        this.logger.error('[OrdersWatcherService] 리스너 실행 중 에러:', err);
      }
    }
  }
}
