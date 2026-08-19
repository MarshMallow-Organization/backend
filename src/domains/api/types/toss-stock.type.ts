// 토스 api 응답 형식을 정의하는 인터페이스

export interface TossStock {
  symbol: string;
  name: string;
}

export interface TossStockResponse {
  result: TossStock[];
}
