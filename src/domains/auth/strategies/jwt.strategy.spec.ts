import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('payload의 sub를 AuthUser 형태로 변환한다', () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;
    const strategy = new JwtStrategy(configService);

    const result = strategy.validate({ sub: 5 });

    expect(result).toEqual({ id: 5 });
  });
});
