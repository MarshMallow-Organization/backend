/**
 * refresh token을 담는 httpOnly 쿠키 이름.
 *
 * AuthController(쿠키를 심음)와 RefreshJwtStrategy(쿠키를 읽음)가
 * 같은 이름을 써야 하므로 한 곳에 둔다.
 */
export const REFRESH_COOKIE_NAME = 'refreshToken';
