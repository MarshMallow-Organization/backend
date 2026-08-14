/**
 * 인증된 사용자 정보.
 *
 * 지금은 스텁 가드가 채우지만, 실제 JWT 가드가 붙어도 이 형태는 유지한다.
 * 도메인 코드는 이 타입만 알고 있으면 되고 토큰 해석 방식은 몰라도 된다.
 */
export interface AuthUser {
  /** users.id */
  readonly id: number;
}

/** 요청 객체에 인증 사용자를 담을 때 쓰는 키. */
export const AUTH_USER_REQUEST_KEY = 'authUser';
