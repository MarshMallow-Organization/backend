/**
 * Swagger 보안 스킴 이름.
 *
 * DocumentBuilder에 등록하는 이름과 컨트롤러의 @ApiSecurity/@ApiBearerAuth가
 * 문자열로 맞아야 하는데, 오타가 나도 빌드가 통과하고 UI에서 자물쇠만 조용히
 * 사라진다. 상수로 묶어 그 실수를 막는다.
 */

/**
 * 현재 인증 수단인 StubAuthGuard의 헤더.
 *
 * ⚠️ 실제 JWT 인증이 붙으면 이 스킴과 그것을 참조하는 @ApiSecurity를 모두
 * 지우고 @ApiBearerAuth()로 바꾼다. StubAuthGuard 자체가 사라질 때 함께 정리한다.
 */
export const STUB_AUTH_SECURITY_SCHEME = 'stub-user';

/** /auths가 발급하는 액세스 토큰. 이를 검증하는 가드는 아직 없다. */
export const BEARER_AUTH_SECURITY_SCHEME = 'access-token';
