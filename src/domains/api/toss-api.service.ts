import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TossStockResponse } from './types/toss-stock.type';

@Injectable()
export class TossApiService {
  constructor(private readonly configService: ConfigService) {}

  async getStockfromToss(stockCode: string): Promise<TossStockResponse> {
    // 토스 종목 기본 정보 api

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

  async getRanking() {
    // 토스 랭킹 API (구현예정)
  }
}
