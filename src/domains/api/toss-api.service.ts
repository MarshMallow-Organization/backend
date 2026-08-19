import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TossStockResponse } from './types/toss-stock.type';
import { TossRankingResponse } from './types/toss-stock.type';

@Injectable()
export class TossApiService {
  constructor(private readonly configService: ConfigService) {}

  // 토스 종목 기본 정보 api
  async getStockfromToss(stockCode: string): Promise<TossStockResponse> {
    const accessToken = this.configService.get<string>('toss.accessToken');

    const response = await fetch(
      `https://openapi.tossinvest.com/api/v1/stocks?symbols=${stockCode}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('토스 API 호출 실패');
    }

    const data = (await response.json()) as TossStockResponse;

    return data;
  }

  // 토스 랭킹 API
  async getRanking(
    marketCountry: string,
    type: string,
    duration: string,
    count: string,
  ): Promise<TossRankingResponse> {
    // url의 파라미터를 객체화
    const queryParams = new URLSearchParams({
      type,
      marketCountry,
      duration,
      count: String(count),
    });
    const accessToken = this.configService.get<string>('toss.accessToken');

    const response = await fetch(
      // 토스 랭킹 조회 url 수정 예정
      `https://openapi.tossinvest.com/api/v1/rankings?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('토스 API 호출 실패');
    }
    const data = (await response.json()) as TossRankingResponse;

    return data;
  }
}
