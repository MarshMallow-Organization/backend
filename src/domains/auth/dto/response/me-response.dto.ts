/** `GET /auths/me`가 반환하는 현재 로그인한 유저 정보. `AuthUser`와 같은 형태를 유지한다. */
export class MeResponseDto {
  /** users.id
   * @example 1
   */
  id: number;
}
