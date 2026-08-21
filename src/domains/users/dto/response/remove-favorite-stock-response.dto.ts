/** DELETE /users/me/favorite-stocks/{stockCode} 응답. */
export class RemoveFavoriteStockResponseDto {
  /** 해제한 종목 코드. 프론트가 어떤 항목을 지웠는지 되짚을 수 있게 돌려준다.
   * @example 005930
   */
  stockCode: string;

  /** 항상 true다. 지울 대상이 없으면 404로 끝나 여기까지 오지 않는다.
   * @example true
   */
  removed: boolean;
}
