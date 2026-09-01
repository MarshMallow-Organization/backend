import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { RefreshJwtStrategy } from './refresh-jwt.strategy';
import { REFRESH_COOKIE_NAME } from '../auth.constants';

describe('RefreshJwtStrategy', () => {
  it('payload와 쿠키의 원본 refresh token을 RefreshUser로 합쳐 반환한다', () => {
    const configService = {
      get: jest.fn().mockReturnValue('refresh-secret'),
    } as unknown as ConfigService;
    const strategy = new RefreshJwtStrategy(configService);
    const req = {
      cookies: { [REFRESH_COOKIE_NAME]: 'raw-refresh-token' },
    } as unknown as Request;

    const result = strategy.validate(req, { sub: 5, sessionId: 42 });

    expect(result).toEqual({
      id: 5,
      sessionId: 42,
      rawRefreshToken: 'raw-refresh-token',
    });
  });
});
