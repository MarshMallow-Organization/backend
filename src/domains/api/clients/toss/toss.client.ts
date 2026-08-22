import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TossStockResponse } from './toss.types';
import { getMockStock, MOCK_RANKINGS } from './toss.mock';

@Injectable()
export class TossClient {
  private readonly logger = new Logger(TossClient.name);
  private readonly baseUrl = 'https://openapi.tossinvest.com/api/v1';

  constructor(private readonly configService: ConfigService) {}

  /**
   * MOCK 모드 활성화 여부 확인 (토큰이 없거나 useMock 플래그가 켜진 경우)
   */
  private isMockMode(): boolean {
    const useMock = this.configService.get<boolean>('toss.useMock');
    const accessToken = this.configService.get<string>('toss.accessToken');
    return Boolean(useMock || !accessToken);
  }

  /**
   * 토스 증권 종목 정보 조회 API
   * @param stockCode 종목 코드 (예: '005930')
   */
  async getStock(stockCode: string): Promise<TossStockResponse> {
    if (this.isMockMode()) {
      this.logger.log(
        `[TossClient] MOCK 모드로 동작합니다. 종목 정보 반환: ${stockCode}`,
      );
      return getMockStock(stockCode);
    }

    const accessToken = this.configService.get<string>('toss.accessToken');

    try {
      const response = await fetch(
        `${this.baseUrl}/stocks?symbols=${encodeURIComponent(stockCode)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(3000), // 3초 타임아웃 방어
        },
      );

      if (!response.ok) {
        throw new Error(
          `[TossClient] API 호출 실패: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as TossStockResponse;
      return data;
    } catch (error) {
      this.logger.error(
        `[TossClient] getStock 실패 (stockCode: ${stockCode}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * 기존 메서드 호환용 별칭 (Alias)
   */
  async getStockfromToss(stockCode: string): Promise<TossStockResponse> {
    return this.getStock(stockCode);
  }

  /**
   * 토스 실시간 랭킹 API (MOCK 지원)
   */
  getRanking(): Promise<unknown[]> {
    if (this.isMockMode()) {
      this.logger.log('[TossClient] MOCK 실시간 랭킹 데이터를 반환합니다.');
      return Promise.resolve(MOCK_RANKINGS);
    }
    // TODO: 실제 랭킹 API 연동
    return Promise.resolve([]);
  }
}
