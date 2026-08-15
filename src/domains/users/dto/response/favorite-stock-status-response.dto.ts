import { FavoriteStockItemDto } from './favorite-stock-item.dto';

/**
 * GET /users/me/favorite-stocks/{stockCode} 응답.
 *
 * 종목 상세 화면의 하트 상태를 그리는 용도다. **미등록도 404가 아니라
 * 200이다.** "리소스를 가져와라"가 아니라 "등록 여부를 물어본다"는
 * 질의이므로 미등록 역시 정상 응답이다.
 *
 * 필드를 평평하게 펴지 않고 favoriteStock으로 감싼 이유는, flat으로 두면
 * 미등록일 때 stockCode·stockName·createdAt이 모두 null이 되어
 * isFavorite이 true인데 stockName이 null인 불가능한 조합까지 타입상
 * 허용되기 때문이다. nested는 null 체크 한 번을 통과하면 내부 필드가
 * non-null임이 보장된다.
 */
export class FavoriteStockStatusResponseDto {
  isFavorite: boolean;

  favoriteStock: FavoriteStockItemDto | null;
}
