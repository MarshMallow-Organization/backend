/**
 * 관심종목 API 오류 응답.
 *
 * 성공 응답과 달리 ResponseInterceptor의 `{ data }`로 감싸지지 않는다.
 * BusinessExceptionFilter가 이 형태를 그대로 내보낸다.
 *
 * assets의 PortfolioErrorResponseDto와 같은 형태다. 도메인별로 나눠 둔
 * 이유는 그쪽 주석에 적어 두었다.
 */
export class FavoriteStockErrorResponseDto {
  /** 클라이언트 분기와 로그 검색에 사용하는 오류 코드.
   * @example FAVORITE_STOCK_NOT_FOUND
   */
  code: string;

  /** 사용자에게 표시할 수 있는 오류 메시지.
   * @example "등록된 관심종목이 아닙니다."
   */
  message: string;

  /** 서버 로그에서 요청을 찾기 위한 추적 ID.
   * @example 550e8400-e29b-41d4-a716-446655440000
   */
  traceId: string;
}
