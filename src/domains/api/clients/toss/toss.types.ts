// 토스 API 응답 원본 인터페이스 정의

export interface TossStock {
  symbol: string;
  name: string;
  price?: number;
  market?: string;
}

export interface TossStockResponse {
  result: TossStock[];
}
