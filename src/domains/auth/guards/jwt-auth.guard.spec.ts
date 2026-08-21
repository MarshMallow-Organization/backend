import { ExecutionContext } from '@nestjs/common';
import { AUTH_USER_REQUEST_KEY, AuthUser } from 'src/common/auth/authUser';
import { JwtAuthGuard } from './jwt-auth.guard';

interface FakeRequest {
  user?: AuthUser;
  [AUTH_USER_REQUEST_KEY]?: AuthUser;
}

const createContext = (request: FakeRequest) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  // AuthGuard('jwt') 믹스인의 실제 canActivate(passport 검증 로직)를 스텁으로 대체한다.
  const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
    canActivate: (context: ExecutionContext) => Promise<boolean>;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('토큰 검증에 성공하면 request.user를 request.authUser에도 채운다', async () => {
    jest.spyOn(parentProto, 'canActivate').mockResolvedValue(true);
    const request: FakeRequest = { user: { id: 7 } };
    const guard = new JwtAuthGuard();

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request[AUTH_USER_REQUEST_KEY]).toEqual({ id: 7 });
  });

  it('토큰 검증에 실패하면 request를 건드리지 않고 false를 반환한다', async () => {
    jest.spyOn(parentProto, 'canActivate').mockResolvedValue(false);
    const request: FakeRequest = {};
    const guard = new JwtAuthGuard();

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(false);
    expect(request[AUTH_USER_REQUEST_KEY]).toBeUndefined();
  });
});
