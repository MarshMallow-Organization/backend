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

const createGuard = (env: string) =>
  new StubAuthGuard({ get: () => env } as unknown as ConfigService);

describe('StubAuthGuard', () => {
  it('local에서 헤더의 사용자 ID를 주입한다', () => {
    const guard = createGuard('local');
    const { context, request } = createContext('42');

    expect(guard.canActivate(context)).toBe(true);
    expect(request[AUTH_USER_REQUEST_KEY]).toEqual({ id: 42 });
  });

  it('헤더가 없으면 기본 사용자로 채운다', () => {
    const guard = createGuard('local');
    const { context, request } = createContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(request[AUTH_USER_REQUEST_KEY]).toEqual({ id: 1 });
  });

  it('헤더 값이 숫자가 아니면 401을 던진다', () => {
    const guard = createGuard('local');
    const { context } = createContext('not-a-number');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  /** 실수로 배포돼도 인증 우회로 쓰이지 않아야 한다. */
  it('local이 아니면 항상 401을 던진다 (fail closed)', () => {
    const guard = createGuard('production');
    const { context, request } = createContext('42');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(request[AUTH_USER_REQUEST_KEY]).toBeUndefined();
  });
});
