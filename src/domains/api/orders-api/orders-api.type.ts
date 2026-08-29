// 토스 및 외부 증권사 주문 관련 원본 통신 타입 정의

export interface TossOrderRawRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

export interface TossOrderRawResponse {
  orderId: string;
  status: string;
  createdAt: string;
  symbol: string;
  quantity: number;
  price?: number;
}

export interface TossCancelOrderRawResponse {
  orderId: string;
  status: string;
  canceledAt: string;
}

export interface TossOrderDetailRawResponse {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  executedQuantity: number;
  price?: number;
  status: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// 토스 조건주문(Conditional Orders) 원본 통신 타입 정의
// ─────────────────────────────────────────────────────────────

export interface TossConditionRawRequest {
  orderSide: 'BUY' | 'SELL';
  triggerPrice: string;
  orderPrice?: string;
}

export interface TossConditionalOrderRawRequest {
  symbol: string;
  type: 'SINGLE' | 'OCO' | 'OTO';
  quantity: string;
  orderType: 'LIMIT' | 'MARKET';
  expireDate: string; // YYYY-MM-DD
  first: TossConditionRawRequest;
  second?: TossConditionRawRequest | null;
  clientOrderId?: string;
  confirmHighValueOrder?: boolean;
}

export interface TossConditionalOrderRawResponse {
  result: {
    conditionalOrderId: string;
  };
}

export interface TossConditionalOrderConditionRaw {
  type: 'STOP' | 'PROFIT_RATE';
  status:
    | 'WATCHING'
    | 'HOLDING'
    | 'PAUSED'
    | 'ORDERING'
    | 'ORDERED'
    | 'COMPLETED'
    | 'EXPIRED'
    | 'CANCELED';
  triggerPrice: string | null;
  targetProfitRate?: string | null;
  orderPrice?: string | null;
  triggeredOrderId?: string | null;
}

export interface TossConditionalOrderDetailRaw {
  conditionalOrderId: string;
  type: 'SINGLE' | 'OCO' | 'OTO';
  status:
    'WATCHING' | 'PAUSED' | 'ORDERING' | 'ORDERED' | 'COMPLETED' | 'EXPIRED';
  symbol: string;
  market: 'KR' | 'US';
  quantity: string;
  orderType: 'LIMIT' | 'MARKET';
  expireDate: string;
  first: TossConditionalOrderConditionRaw;
  second?: TossConditionalOrderConditionRaw | null;
  createdAt: string;
}

export interface TossConditionalOrderDetailRawResponse {
  result: TossConditionalOrderDetailRaw;
}

export interface TossConditionalOrderListRawResponse {
  result: TossConditionalOrderDetailRaw[];
}

export interface TossConditionalOrderModifyRawRequest {
  type: 'SINGLE' | 'OCO' | 'OTO';
  quantity: string;
  orderType: 'LIMIT' | 'MARKET';
  expireDate: string;
  first: TossConditionRawRequest;
  second?: TossConditionRawRequest | null;
}
