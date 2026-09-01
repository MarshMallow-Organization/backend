/**
 * POST /auths/logout 응답.
 *
 * 204 No Content 대신 200 + 본문을 써서 ResponseInterceptor의 { data }
 * 형식을 다른 엔드포인트와 일관되게 유지한다(PortfolioDeletedDto와 같은 이유).
 */
export class LogoutResponseDto {
  /**
   * 항상 true다. 실패하면(세션을 못 찾아도 idempotent하게 성공 처리) 예외가
   * 나가지 않으므로 false가 담길 일은 없다.
   * @example true
   */
  loggedOut: boolean;
}
