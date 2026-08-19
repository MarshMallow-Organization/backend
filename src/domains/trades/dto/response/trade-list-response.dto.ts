import { TradeResponseDto } from './trade-response.dto';

export class TradeListResponseDto {
  items: TradeResponseDto[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
  hasNext: boolean;

  static of(
    items: TradeResponseDto[],
    totalCount: number,
    page: number,
    size: number,
  ): TradeListResponseDto {
    const totalPages = Math.ceil(totalCount / size);
    const dto = new TradeListResponseDto();
    dto.items = items;
    dto.totalCount = totalCount;
    dto.page = page;
    dto.size = size;
    dto.totalPages = totalPages;
    dto.hasNext = page + 1 < totalPages;
    return dto;
  }
}
