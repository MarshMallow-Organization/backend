import { ApiProperty } from '@nestjs/swagger';

/** 종목 검색 결과의 개별 항목. */
export class StockListItemDto {
  @ApiProperty({ example: '005930' })
  stockCode: string;

  @ApiProperty({ example: '삼성전자' })
  name: string;

  @ApiProperty({ example: 'KOSPI' })
  market: string;

  @ApiProperty({ example: 'STOCK' })
  securityType: string;

  @ApiProperty({ example: true })
  isCommonShare: boolean;
}

/** 종목 목록과 페이지 정보를 담는 응답 DTO. */
export class GetStocksResponseDto {
  @ApiProperty({ type: [StockListItemDto] })
  items: StockListItemDto[];

  @ApiProperty({ example: 42 })
  totalCount: number;

  @ApiProperty({ example: 0 })
  page: number;

  @ApiProperty({ example: 20 })
  size: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  static of(
    items: StockListItemDto[],
    totalCount: number,
    page: number,
    size: number,
  ): GetStocksResponseDto {
    const totalPages = Math.ceil(totalCount / size);
    const response = new GetStocksResponseDto();
    response.items = items;
    response.totalCount = totalCount;
    response.page = page;
    response.size = size;
    response.totalPages = totalPages;
    response.hasNext = page + 1 < totalPages;
    return response;
  }
}
