import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TossStockResponse } from './types/toss-stock.type';

@Injectable()
export class TossApiService {
  constructor(private readonly configService: ConfigService) {}

  async getStockfromToss(stockCode: string): Promise<TossStockResponse> {
    // 토스 종목 조회 api
    /*
    accessToken을 쓰는 이유
    토큰을 실제로 코드에 입력하면 안되므로 accessToken으로 받아옴
    */
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
