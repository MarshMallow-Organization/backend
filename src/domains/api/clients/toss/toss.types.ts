// 토스 API 응답 원본 인터페이스 정의

export interface TossStock {
  // 토스 종목 정보
  symbol: string;
  name: string;
  englishName?: string;
  isinCode?: string;
  market?: string;
  securityType?: string;
  isCommonShare?: boolean;
  status?: string;
  currency?: string;
  listDate?: string;
  delistDate?: string | null;
  sharesOutstanding?: string;
  price?: number;
  [key: string]: unknown;
}

export interface TossStockResponse {
  result: TossStock[];
}

/** 토스 인증 토큰 응답 인터페이스 */
export interface TossTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number; // 초 단위 유효기간
}

/** 토스 에러 응답 Envelope 인터페이스 */
export interface TossErrorDetail {
  requestId?: string;
  referenceId?: string;
  code: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface TossErrorEnvelope {
  error: TossErrorDetail;
}

/** 토스 API 인증 키 정보 (개발자 기본값 또는 사용자별 키) */
export interface TossCredentials {
  clientKey: string;
  clientSecret: string;
  accessToken?: string;
}
