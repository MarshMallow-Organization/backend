import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** 명세(openapi.yaml AddPortfolioStockRequest): 국내 종목 기준 6자리 숫자. */
const STOCK_CODE_PATTERN = /^\d{6}$/;

/** POST /assets/portfolios/:portfolioId/stocks 요청 본문. */
export class AddPortfolioStockDto {
  /**
   * 종목 코드.
   *
   * 형식만 본다. 실재하는 종목인지는 확인하지 않는다. 종목 조회 서비스
   * (신태하 담당 GET /stocks/{symbol})가 붙으면 STOCK_NOT_FOUND를 추가한다.
   *
   * IsString을 따로 붙이지 않는다. Matches가 문자열이 아닌 값도 걸러낸다.
   */
  @ApiProperty({
    description: '종목 코드. 국내 종목 기준 6자리 숫자.',
    pattern: '^\\d{6}$',
    example: '005930',
  })
  @Matches(STOCK_CODE_PATTERN, {
    message: 'stockCode는 6자리 숫자여야 합니다',
  })
  stockCode: string;
}
