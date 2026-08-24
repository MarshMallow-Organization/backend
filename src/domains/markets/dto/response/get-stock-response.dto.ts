import { ApiProperty } from '@nestjs/swagger';

/** 국내 종목에만 존재하는 거래 상태 정보. 해외 종목은 객체 자체가 null이다. */
export class KoreanMarketDetailDto {
  @ApiProperty()
  liquidationTrading: boolean;

  @ApiProperty()
  nxtSupported: boolean;

  @ApiProperty()
  krxTradingSuspended: boolean;

  @ApiProperty({ nullable: true })
  nxtTradingSuspended: boolean | null;
}

/** 숨김 상태가 아닌 종목의 상세 응답. */
export class StockDetailResponseDto {
  @ApiProperty({ examples: ['005930', 'AAPL'] })
  symbol: string;

  @ApiProperty({ example: '삼성전자' })
  name: string;

  @ApiProperty({ example: 'Samsung Electronics' })
  englishName: string;

  @ApiProperty({ example: 'KR7005930003' })
  isinCode: string;

  @ApiProperty({ example: 'KOSPI' })
  market: string;

  @ApiProperty({ example: 'STOCK' })
  securityType: string;

  @ApiProperty()
  isCommonShare: boolean;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: 'KRW' })
  currency: string;

  @ApiProperty({ nullable: true, example: '1975-06-11' })
  listDate: string | null;

  @ApiProperty({ nullable: true })
  delistDate: string | null;

  @ApiProperty({ example: '5919637922' })
  sharesOutstanding: string;

  @ApiProperty({ nullable: true })
  leverageFactor: string | null;

  @ApiProperty({ type: KoreanMarketDetailDto, nullable: true })
  koreanMarketDetail: KoreanMarketDetailDto | null;

  @ApiProperty({ enum: [false] })
  declare isHidden: false;
}

/** 아직 숨김 기간이 끝나지 않은 종목의 제한된 응답. */
export class HiddenStockDetailResponseDto {
  @ApiProperty({ example: '005930' })
  symbol: string;

  @ApiProperty({ example: '삼성전자' })
  name: string;

  @ApiProperty({ example: '숨김 처리된 종목입니다.' })
  message: string;

  @ApiProperty({
    description: '숨김 종료 시각(ISO 8601)',
    example: '2099-08-31T23:59:59.000Z',
  })
  hiddenUntil: string;

  @ApiProperty({ enum: [true] })
  declare isHidden: true;
}

/** isHidden 값으로 정상 종목과 숨김 종목을 구별하는 응답 유니온. */
export type GetStockResponseDto =
  StockDetailResponseDto | HiddenStockDetailResponseDto;
