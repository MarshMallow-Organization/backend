import { BusinessException } from '../../common/exception/businessException';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoogleOAuthClient } from './google-oauth.client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

const expectBusinessException = async (
  promise: Promise<unknown>,
  code: string,
): Promise<void> => {
  try {
    await promise;
    throw new Error(`Expected BusinessException with code ${code}`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(BusinessException);

    if (!(error instanceof BusinessException)) {
      throw error;
    }

    expect(error.definition.code).toBe(code);
  }
};

const CONFIG_VALUES: Record<string, string> = {
  'jwt.accessSecret': 'access-secret',
  'jwt.refreshSecret': 'refresh-secret',
  'jwt.accessExpiresIn': '15m',
  'jwt.refreshExpiresIn': '14d',
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    loginSession: { create: jest.Mock; update: jest.Mock };
    oAuth: { findFirst: jest.Mock; create: jest.Mock };
    oAuthProvider: { upsert: jest.Mock };
  };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let googleOAuthClient: { getUserInfo: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      loginSession: { create: jest.fn(), update: jest.fn() },
      oAuth: { findFirst: jest.fn(), create: jest.fn() },
      oAuthProvider: { upsert: jest.fn() },
    };
    jwtService = { sign: jest.fn() };
    configService = { get: jest.fn((key: string) => CONFIG_VALUES[key]) };
    googleOAuthClient = { getUserInfo: jest.fn() };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      googleOAuthClient as unknown as GoogleOAuthClient,
    );
  });

  describe('validateUser', () => {
    it('존재하지 않는 이메일이면 INVALID_CREDENTIALS를 던진다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectBusinessException(
        service.validateUser('none@test.com', 'pw'),
        'INVALID_CREDENTIALS',
      );
    });

    it('비밀번호가 없는(소셜 전용) 계정이면 PASSWORD_NOT_SET을 던진다', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        password: null,
      });

      await expectBusinessException(
        service.validateUser('a@test.com', 'pw'),
        'PASSWORD_NOT_SET',
      );
    });

    it('비밀번호가 일치하지 않으면 INVALID_CREDENTIALS를 던진다', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        password: 'hashed',
      });
      bcryptMock.compare.mockResolvedValue(false as never);

      await expectBusinessException(
        service.validateUser('a@test.com', 'wrong-pw'),
        'INVALID_CREDENTIALS',
      );
    });

    it('이메일과 비밀번호가 일치하면 password를 제외한 유저를 반환한다', async () => {
      const user = { id: 1, email: 'a@test.com', password: 'hashed' };
      prisma.user.findUnique.mockResolvedValue(user);
      bcryptMock.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('a@test.com', 'pw');

      expect(result).toEqual({ id: 1, email: 'a@test.com' });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('signup', () => {
    it('이미 가입된 이메일이면 EMAIL_ALREADY_EXISTS를 던지고 유저를 생성하지 않는다', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expectBusinessException(
        service.signup({ email: 'a@test.com', password: 'pw', name: '테스트' }),
        'EMAIL_ALREADY_EXISTS',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('새 이메일이면 비밀번호를 해싱해 유저를 생성하고 토큰을 발급한다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      bcryptMock.hash.mockResolvedValue('hashed-pw' as never);
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        name: '테스트',
      });
      prisma.loginSession.create.mockResolvedValue({ id: 10 });
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.signup({
        email: 'a@test.com',
        password: 'pw',
        name: '테스트',
      });

      expect(bcryptMock.hash).toHaveBeenCalledWith('pw', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'a@test.com', password: 'hashed-pw', name: '테스트' },
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshExpiresInMs: 14 * 24 * 60 * 60 * 1000,
      });
    });
  });

  describe('issueTokens', () => {
    it('access/refresh 토큰을 각각 알맞은 secret·만료시간으로 서명한다', async () => {
      const user = { id: 1, email: 'a@test.com' };
      prisma.loginSession.create.mockResolvedValue({ id: 99 });
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      bcryptMock.hash.mockResolvedValue('refresh-token-hash' as never);

      const result = await service.issueTokens(user);

      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: 1, email: 'a@test.com' },
        { secret: 'access-secret', expiresIn: 15 * 60 },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        { sub: 1, sessionId: 99 },
        { secret: 'refresh-secret', expiresIn: 14 * 24 * 60 * 60 },
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshExpiresInMs: 14 * 24 * 60 * 60 * 1000,
      });
    });

    it('LoginSession을 먼저 빈 해시로 생성한 뒤, 발급된 refresh token의 해시로 갱신한다', async () => {
      const user = { id: 1, email: 'a@test.com' };
      prisma.loginSession.create.mockResolvedValue({ id: 99 });
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      bcryptMock.hash.mockResolvedValue('refresh-token-hash' as never);

      await service.issueTokens(user);

      expect(prisma.loginSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          refreshTokenHash: '',
        }) as { userId: number; refreshTokenHash: string },
      });
      expect(bcryptMock.hash).toHaveBeenCalledWith('refresh-token', 10);
      expect(prisma.loginSession.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: { refreshTokenHash: 'refresh-token-hash' },
      });
    });
  });

  describe('loginWithGoogle', () => {
    const googleUser = {
      sub: 'google-sub-id',
      email: 'google@test.com',
      email_verified: true,
      name: '구글유저',
    };

    beforeEach(() => {
      googleOAuthClient.getUserInfo.mockResolvedValue(googleUser);
      prisma.loginSession.create.mockResolvedValue({ id: 1 });
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      bcryptMock.hash.mockResolvedValue('refresh-token-hash' as never);
    });

    it('이미 연동된 계정이면 그 유저로 바로 로그인하고 새로 만들지 않는다', async () => {
      const linkedUser = { id: 5, email: 'google@test.com' };
      prisma.oAuth.findFirst.mockResolvedValue({ user: linkedUser });

      const result = await service.loginWithGoogle('auth-code');

      expect(prisma.oAuth.findFirst).toHaveBeenCalledWith({
        where: {
          providerKey: 'google-sub-id',
          provider: { provider: 'google' },
        },
        include: { user: true },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.oAuth.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshExpiresInMs: 14 * 24 * 60 * 60 * 1000,
      });
    });

    it('연동 기록은 없지만 같은 이메일의 로컬 계정이 있으면 그 계정에 OAuth를 추가해 연동한다', async () => {
      const existingUser = { id: 7, email: 'google@test.com' };
      prisma.oAuth.findFirst.mockResolvedValue(null);
      prisma.oAuthProvider.upsert.mockResolvedValue({ id: 1 });
      prisma.user.findUnique.mockResolvedValue(existingUser);

      await service.loginWithGoogle('auth-code');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.oAuth.create).toHaveBeenCalledWith({
        data: { providerId: 1, providerKey: 'google-sub-id', userId: 7 },
      });
    });

    it('연동 기록도 없고 같은 이메일 계정도 없으면 신규 가입 처리한다', async () => {
      prisma.oAuth.findFirst.mockResolvedValue(null);
      prisma.oAuthProvider.upsert.mockResolvedValue({ id: 1 });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 9, email: 'google@test.com' });

      await service.loginWithGoogle('auth-code');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'google@test.com', name: '구글유저' },
      });
      expect(prisma.oAuth.create).toHaveBeenCalledWith({
        data: { providerId: 1, providerKey: 'google-sub-id', userId: 9 },
      });
    });
  });
});
