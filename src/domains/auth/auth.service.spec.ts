import { BusinessException } from '../../common/exception/businessException';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoogleOAuthClient } from './google-oauth.client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

jest.mock('bcrypt');

const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

/**
 * AuthService가 refresh token을 해싱하는 방식(SHA-256)과 정확히 같은
 * 함수. bcrypt는 앞 72바이트만 봐서 회전마다 바뀌는 JWT의 iat/exp가
 * 그 뒤에 오면 서로 다른 토큰을 같다고 오판했던 실제 버그가 있었다
 * (실서버 테스트로 재현) — 그래서 refresh token 해시만 SHA-256을 쓴다.
 */
const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

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
    loginSession: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
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
      loginSession: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
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

    it('LoginSession을 먼저 빈 해시로 생성한 뒤, 발급된 refresh token의 SHA-256 해시로 갱신한다', async () => {
      const user = { id: 1, email: 'a@test.com' };
      prisma.loginSession.create.mockResolvedValue({ id: 99 });
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await service.issueTokens(user);

      expect(prisma.loginSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          refreshTokenHash: '',
        }) as { userId: number; refreshTokenHash: string },
      });
      // bcrypt가 아니라 SHA-256으로 해싱한다 — 이유는 파일 상단 sha256 주석 참고.
      expect(prisma.loginSession.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: expect.objectContaining({
          refreshTokenHash: sha256('refresh-token'),
        }) as { refreshTokenHash: string },
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

  describe('refreshTokens', () => {
    const FUTURE = new Date(Date.now() + 60 * 60 * 1000);
    const PAST = new Date(Date.now() - 60 * 1000);

    beforeEach(() => {
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
    });

    it('세션이 없으면 INVALID_REFRESH_TOKEN을 던진다', async () => {
      prisma.loginSession.findUnique.mockResolvedValue(null);

      await expectBusinessException(
        service.refreshTokens(1, 99, 'raw-refresh-token'),
        'INVALID_REFRESH_TOKEN',
      );
    });

    it('세션의 userId가 토큰의 userId와 다르면 INVALID_REFRESH_TOKEN을 던진다', async () => {
      prisma.loginSession.findUnique.mockResolvedValue({
        id: 99,
        userId: 2, // 요청은 userId 1로 왔는데 세션 주인은 2
        expiresAt: FUTURE,
        refreshTokenHash: 'hash',
      });

      await expectBusinessException(
        service.refreshTokens(1, 99, 'raw-refresh-token'),
        'INVALID_REFRESH_TOKEN',
      );
    });

    it('세션이 만료됐으면 세션을 지우고 INVALID_REFRESH_TOKEN을 던진다', async () => {
      prisma.loginSession.findUnique.mockResolvedValue({
        id: 99,
        userId: 1,
        expiresAt: PAST,
        refreshTokenHash: 'hash',
      });

      await expectBusinessException(
        service.refreshTokens(1, 99, 'raw-refresh-token'),
        'INVALID_REFRESH_TOKEN',
      );
      expect(prisma.loginSession.delete).toHaveBeenCalledWith({
        where: { id: 99 },
      });
    });

    it('원본 refresh token이 저장된 해시와 다르면(이미 회전됨) 세션을 지우고 INVALID_REFRESH_TOKEN을 던진다', async () => {
      prisma.loginSession.findUnique.mockResolvedValue({
        id: 99,
        userId: 1,
        expiresAt: FUTURE,
        // 다른(이미 회전으로 무효화된) 토큰의 해시 — 지금 보낸 토큰과 안 맞아야 한다.
        refreshTokenHash: sha256('previously-rotated-out-token'),
      });

      await expectBusinessException(
        service.refreshTokens(1, 99, 'stolen-or-rotated-token'),
        'INVALID_REFRESH_TOKEN',
      );
      expect(prisma.loginSession.delete).toHaveBeenCalledWith({
        where: { id: 99 },
      });
    });

    it('유저가 이미 삭제됐으면 세션을 지우고 INVALID_REFRESH_TOKEN을 던진다', async () => {
      prisma.loginSession.findUnique.mockResolvedValue({
        id: 99,
        userId: 1,
        expiresAt: FUTURE,
        refreshTokenHash: sha256('raw-refresh-token'),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expectBusinessException(
        service.refreshTokens(1, 99, 'raw-refresh-token'),
        'INVALID_REFRESH_TOKEN',
      );
      expect(prisma.loginSession.delete).toHaveBeenCalledWith({
        where: { id: 99 },
      });
    });

    it('유효한 refresh token이면 새 토큰 쌍을 발급하고 같은 세션을 회전(갱신)한다', async () => {
      prisma.loginSession.findUnique.mockResolvedValue({
        id: 99,
        userId: 1,
        expiresAt: FUTURE,
        refreshTokenHash: sha256('raw-refresh-token'),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
      });

      const result = await service.refreshTokens(1, 99, 'raw-refresh-token');

      // 새 세션을 만들지 않고 기존 세션(99)을 그대로 회전한다.
      expect(prisma.loginSession.create).not.toHaveBeenCalled();
      expect(prisma.loginSession.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: expect.objectContaining({
          refreshTokenHash: sha256('new-refresh-token'),
        }) as { refreshTokenHash: string },
      });
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        refreshExpiresInMs: 14 * 24 * 60 * 60 * 1000,
      });
    });

    it('실제 회전 시나리오: 회전 전 토큰으로 재요청하면 거부된다(회귀 방지)', async () => {
      // 실서버 테스트로 재현했던 버그의 회귀 테스트: bcrypt 72바이트 truncation
      // 때문에 sub/sessionId가 같은 서로 다른 토큰을 같다고 오판했었다.
      const oldRawToken = 'old.jwt.with-same-sub-sessionId-prefix';
      const newRawToken = 'old.jwt.but-different-suffix-only-after-72-bytes';

      // 세션은 회전 후(새 토큰의 해시)로 갱신된 상태를 가정한다.
      prisma.loginSession.findUnique.mockResolvedValue({
        id: 99,
        userId: 1,
        expiresAt: FUTURE,
        refreshTokenHash: sha256(newRawToken),
      });

      await expectBusinessException(
        service.refreshTokens(1, 99, oldRawToken),
        'INVALID_REFRESH_TOKEN',
      );
    });
  });

  describe('logout', () => {
    it('해당 세션을 삭제한다', async () => {
      prisma.loginSession.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout(99);

      expect(prisma.loginSession.deleteMany).toHaveBeenCalledWith({
        where: { id: 99 },
      });
    });

    it('이미 삭제된(존재하지 않는) 세션이어도 에러 없이 성공한다(idempotent)', async () => {
      prisma.loginSession.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.logout(99)).resolves.toBeUndefined();
    });
  });
});
