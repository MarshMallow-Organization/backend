import { TossCredentials } from '../clients/toss/toss.types';

// orders 도메인과 OrdersApiService 간 데이터 교환용 DTO 정의

export interface CreateOrderApiRequestDto {
  symbol: string; // 종목 코드 (예: '005930')
  tradeType: 'BUY' | 'SELL'; // 매수 / 매도
  orderType: 'MARKET' | 'LIMIT'; // 시장가 / 지정가
  quantity: number; // 주문 수량
  price?: number; // 주문 가격 (지정가일 경우)
  accountSeq?: string | number; // 토스 계좌 시퀀스 식별자 (기본값: '1')
  tossCredentials?: TossCredentials; // 사용자별 토스 키 (없으면 .env 기본 개발자 키)
}

export interface CreateOrderApiResponseDto {
  orderId: string; // 외부 API 주문 식별자
  status: string; // 접수 상태 (예: 'ACCEPTED', 'PENDING')
  orderedAt: string; // 주문 접수 일시
  symbol: string;
  quantity: number;
  price?: number;
  rawResponse?: unknown; // 외부 API 원본 응답 데이터
}

export interface CancelOrderApiRequestDto {
  orderId: string; // 취소할 외부 주문 식별자
  accountSeq?: string | number;
  tossCredentials?: TossCredentials;
}

export interface CancelOrderApiResponseDto {
  orderId: string;
  status: string; // 취소 상태 (예: 'CANCELED')
  canceledAt?: string;
  rawResponse?: unknown;
}

export interface GetOrderApiResponseDto {
  orderId: string;
  symbol: string;
  tradeType: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  executedQuantity: number; // 체결 완료 수량
  price?: number;
  status: string; // 주문 상태
  orderedAt: string;
  rawResponse?: unknown;
}

/** KIS REST 시세 조회 결과 (orders 테이블 perAtOrder, pbrAtOrder, marketCapAtOrder 매핑용) */
export interface StockOrderValuationDto {
  symbol: string;
  currentPrice?: number;
  perAtOrder?: number;
  pbrAtOrder?: number;
  marketCapAtOrder?: number;
}

// ─────────────────────────────────────────────────────────────
// 토스 조건주문(Conditional Orders) DTO
// ─────────────────────────────────────────────────────────────

export interface CreateConditionalOrderApiRequestDto extends CreateOrderApiRequestDto {
  triggerPrice: number; // 감시 가격
  expiredAt: string | Date; // 조건 만료 일시
}

export interface CreateConditionalOrderApiResponseDto {
  conditionalOrderId: string;
  rawResponse?: unknown;
}

export interface CancelConditionalOrderApiRequestDto {
  conditionalOrderId: string;
  accountSeq?: string | number;
  tossCredentials?: TossCredentials;
}

export interface CancelConditionalOrderApiResponseDto {
  conditionalOrderId: string;
  success: boolean;
}

export interface GetConditionalOrderApiResponseDto {
  conditionalOrderId: string;
  symbol: string;
  type: string;
  status: string;
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  expireDate: string;
  tradeType: 'BUY' | 'SELL';
  triggerPrice: number;
  orderPrice?: number;
  triggeredOrderId?: string | null;
  createdAt: string;
  rawResponse?: unknown;
}
