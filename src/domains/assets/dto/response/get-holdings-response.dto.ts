import { HoldingDto } from './holding.dto';

/** 보유 종목 상세 목록 조회 응답. 숨김 처리되지 않은 종목만 담긴다. */
export class GetHoldingsResponseDto {
  /** 조회된 보유 종목 목록. */
  items: HoldingDto[];

  /** 현재 페이지 번호. @example 0 */
  page: number;
  /** 페이지 크기. @example 10 */
  size: number;

  /** 필터 조건에 해당하는 전체 종목 수. @example 3 */
  totalElements: number;
  /** 전체 페이지 수. @example 1 */
  totalPages: number;

  /** 다음 페이지 존재 여부. @example false */
  hasNext: boolean;
}
