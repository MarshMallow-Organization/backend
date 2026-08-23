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
