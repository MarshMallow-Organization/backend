/** Diaries API 오류 응답. */
export class DiaryErrorResponseDto {
  /** 클라이언트 분기와 로그 검색에 사용하는 오류 코드.
   * @example ORDER_NOT_FOUND
   */
  code: string;

  /** 사용자에게 표시할 수 있는 오류 메시지.
   * @example 주문을 찾을 수 없습니다.
   */
  message: string;

  /** 서버 로그에서 요청을 찾기 위한 추적 ID.
   * @example 550e8400-e29b-41d4-a716-446655440000
   */
  traceId: string;
}
