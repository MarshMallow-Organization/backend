import { ApiProperty } from '@nestjs/swagger';
import { FavoriteStockItemDto } from './favorite-stock-item.dto';

/** GET /users/me/favorite-stocks 응답. */
export class FavoriteStockListResponseDto {
  /**
   * 최근 등록 순으로 정렬된 관심종목 목록.
   *
   * 배열을 data에 직접 넣지 않고 객체로 한 번 감싼다. 나중에 totalCount나
   * 페이지네이션을 추가할 때 응답 형태를 바꾸지 않아도 되기 때문이다.
   */
  @ApiProperty({
    description:
      '최근 등록 순으로 정렬된 관심종목 목록. 등록된 종목이 없으면 빈 배열이다.',
    type: [FavoriteStockItemDto],
  })
  favoriteStocks: FavoriteStockItemDto[];
}
