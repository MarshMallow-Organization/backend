/**
 * signup/login 성공 시 응답 바디.
 *
 * refresh token은 여기 안 실리고 httpOnly 쿠키로만 내려간다.
 */
export class AccessTokenResponseDto {
  /** 이후 요청의 Authorization: Bearer 헤더에 실을 access token.
   * @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  accessToken: string;
}
