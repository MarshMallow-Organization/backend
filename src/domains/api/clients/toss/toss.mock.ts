import { TossStock, TossStockResponse } from './toss.types';

/**
 * 사전 정의된 대표 종목 MOCK 데이터
 */
export const MOCK_STOCKS: Record<string, TossStock> = {
  // 국내 주요 종목
  '005930': {
    symbol: '005930',
    name: '삼성전자',
    price: 74500,
    market: 'KOSPI',
  },
  '000660': {
    symbol: '000660',
    name: 'SK하이닉스',
    price: 198000,
    market: 'KOSPI',
  },
  '035420': {
    symbol: '035420',
    name: 'NAVER',
    price: 173500,
    market: 'KOSPI',
  },
  '035720': {
    symbol: '035720',
    name: '카카오',
    price: 39800,
    market: 'KOSPI',
  },
  '005380': {
    symbol: '005380',
    name: '현대차',
    price: 241000,
    market: 'KOSPI',
  },
  '068270': {
    symbol: '068270',
    name: '셀트리온',
    price: 192000,
    market: 'KOSPI',
  },

  // 해외 주요 종목
  AAPL: {
    symbol: 'AAPL',
    name: '애플 (Apple Inc.)',
    price: 224,
    market: 'NASDAQ',
  },
  TSLA: {
    symbol: 'TSLA',
    name: '테슬라 (Tesla Inc.)',
    price: 215,
    market: 'NASDAQ',
  },
  NVDA: {
    symbol: 'NVDA',
    name: '엔비디아 (NVIDIA Corp.)',
    price: 128,
    market: 'NASDAQ',
  },
};

/**
 * 모의 종목 조회 함수
 * @param stockCode 종목 코드
 */
export function getMockStock(stockCode: string): TossStockResponse {
  // 1. 존재하지 않는 종목 테스트용 코드 ('INVALID', '999999', 'NOT_FOUND')
  const notFoundCodes = ['INVALID', '999999', 'NOT_FOUND', '000000'];
  if (notFoundCodes.includes(stockCode.toUpperCase())) {
    return { result: [] };
  }

  // 2. 사전에 정의된 대표 종목 반환
  if (MOCK_STOCKS[stockCode]) {
    return { result: [MOCK_STOCKS[stockCode]] };
  }

  // 3. 사전에 정의되지 않은 종목 코드라도 개발 편의를 위해 가상 종목 동적 생성 반환
  return {
    result: [
      {
        symbol: stockCode,
        name: `모의종목_${stockCode}`,
        price: 50000,
        market: 'KOSPI',
      },
    ],
  };
}

/**
 * 모의 실시간 랭킹 데이터
 */
export const MOCK_RANKINGS = [
  { rank: 1, symbol: '005930', name: '삼성전자', changeRate: 1.5 },
  { rank: 2, symbol: '000660', name: 'SK하이닉스', changeRate: 3.2 },
  { rank: 3, symbol: 'NVDA', name: '엔비디아', changeRate: 4.8 },
  { rank: 4, symbol: '035420', name: 'NAVER', changeRate: -0.8 },
  { rank: 5, symbol: 'TSLA', name: '테슬라', changeRate: 2.1 },
];
