import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_USER_REQUEST_KEY, AuthUser } from './authUser';
import { StubAuthGuard } from './stubAuth.guard';

interface FakeRequest {
  header: (name: string) => string | undefined;
  [AUTH_USER_REQUEST_KEY]?: AuthUser;
}

const createContext = (headerValue?: string) => {
  const request: FakeRequest = {
    header: (name) => (name === 'x-stub-user-id' ? headerValue : undefined),
  };

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
};

const createGuard = (stubEnabled: boolean) =>
  new StubAuthGuard({ get: () => stubEnabled } as unknown as ConfigService);

describe('StubAuthGuard', () => {
  it('활성화 상태에서 헤더의 사용자 ID를 주입한다', () => {
    const guard = createGuard(true);
    const { context, request } = createContext('42');

    expect(guard.canActivate(context)).toBe(true);
    expect(request[AUTH_USER_REQUEST_KEY]).toEqual({ id: 42 });
  });

  it('헤더가 없으면 기본 사용자로 채운다', () => {
    const guard = createGuard(true);
    const { context, request } = createContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(request[AUTH_USER_REQUEST_KEY]).toEqual({ id: 1 });
  });

  it('헤더 값이 숫자가 아니면 401을 던진다', () => {
    const guard = createGuard(true);
    const { context } = createContext('not-a-number');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  /**
   * STUB_AUTH_ENABLED 미설정이 곧 이 상태다.
   * 환경변수를 깜빡한 배포가 인증 우회로 이어지지 않아야 한다.
   */
  it('비활성이면 401을 던진다 (미설정이 기본값이라 배포 시 자동 차단)', () => {
    const guard = createGuard(false);
    const { context, request } = createContext('42');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(request[AUTH_USER_REQUEST_KEY]).toBeUndefined();
  });
});
