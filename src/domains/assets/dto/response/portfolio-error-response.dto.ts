/**
 * 가상계좌 API 오류 응답.
 *
 * 성공 응답과 달리 ResponseInterceptor의 `{ data }`로 감싸지지 않는다.
 * BusinessExceptionFilter가 이 형태를 그대로 내보낸다.
 *
 * Diaries의 DiaryErrorResponseDto와 형태가 같지만 도메인별로 따로 둔다.
 * 컨트롤러·에러 카탈로그를 리소스 단위로 나눈 것과 같은 이유이고,
 * 공용 DTO로 합치는 판단은 도메인이 다 올라온 뒤에 한다.
 */
export class PortfolioErrorResponseDto {
  /** 클라이언트 분기와 로그 검색에 사용하는 오류 코드.
   * @example PORTFOLIO_NOT_FOUND
   */
  code: string;

  /** 사용자에게 표시할 수 있는 오류 메시지.
   * @example "가상계좌를 찾을 수 없습니다."
   */
  message: string;

  /** 서버 로그에서 요청을 찾기 위한 추적 ID.
   * @example 550e8400-e29b-41d4-a716-446655440000
   */
  traceId: string;
}
