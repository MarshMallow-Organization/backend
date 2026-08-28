import { HoldingItemDto } from './holding-item.dto';

/**
 * 보유 종목 상세 목록 조회 응답. 숨김 처리되지 않은 종목만 담긴다.
 *
 * 화면이 페이지 버튼 없이 한 화면에서 전부 스크롤하는 구조라
 * 페이지네이션 없이 전체 목록을 한 번에 준다.
 */
export class GetHoldingsResponseDto {
  /** 조회된 보유 종목 목록. */
  items: HoldingItemDto[];
}
