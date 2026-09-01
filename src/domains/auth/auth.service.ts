import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exception/businessException';
import { AuthErrorCode } from './auth-error-code';
import { SignupDto } from './dto/signup.dto';
import { GoogleOAuthClient } from './google-oauth.client';

const SALT_ROUNDS = 10;

/** OAuthProvider.provider 값. 지금은 구글 하나뿐이라 여기 상수로만 둔다. */
const GOOGLE_PROVIDER = 'google';

/**
 * refresh token(JWT) 해시 전용. bcrypt는 쓰지 않는다 — bcrypt는 앞
 * 72바이트만 보는데, JWT는 sub/sessionId가 같은 채로 회전할 때마다
 * 달라지는 부분(iat/exp)이 보통 72바이트를 넘어간 지점에 있어서
 * 서로 다른 토큰인데도 bcrypt.compare가 true를 반환하는 사고가 났다
 * (실서버 테스트로 재현·확인함). bcrypt는 사람이 만드는 짧고 추측
 * 가능한 비밀번호에 맞는 느린 해시고, refresh token처럼 이미 충분히
 * 무작위인 긴 문자열에는 길이 제한 없는 SHA-256이면 충분하다.
 */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 타이밍 공격을 피하려고 문자열 비교(===) 대신 timingSafeEqual을 쓴다. */
function refreshTokenMatches(rawToken: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashRefreshToken(rawToken), 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  return (
    candidate.length === stored.length && timingSafeEqual(candidate, stored)
  );
}

/** '15m', '14d' 같은 jsonwebtoken 형식의 만료시간 문자열을 ms로 변환 */
function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    throw new Error(`지원하지 않는 만료시간 형식입니다: ${duration}`);
  }

  const value = Number(match[1]);
  const unitMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[match[2] as 's' | 'm' | 'h' | 'd'];

  return value * unitMs;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleOAuthClient: GoogleOAuthClient,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS, {
        email,
      });
    }

    if (!user.password) {
      throw new BusinessException(AuthErrorCode.PASSWORD_NOT_SET, { email });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS, {
        email,
      });
    }

    // req.user로 그대로 흘러가는 값이라, 해시라도 비밀번호는 남기지 않는다.
    const { password: _password, ...safeUser } = user;
    void _password;
    return safeUser;
  }

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BusinessException(AuthErrorCode.EMAIL_ALREADY_EXISTS, {
        email: dto.email,
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    return this.issueTokens(user);
  }

  /**
   * 구글 authorization code로 로그인/회원가입한다.
   *
   * 1. (provider='google', providerKey=구글 sub)로 이미 연동된 계정이면
   *    그 유저로 바로 로그인한다.
   * 2. 아니면 이메일로 기존 유저를 찾는다 — 로컬(이메일/비밀번호)로
   *    이미 가입한 이메일과 같으면, 그 계정에 OAuth 행만 추가해서
   *    자동으로 연동한다(비밀번호 로그인도 계속 가능).
   * 3. 이메일로도 못 찾으면 신규 유저를 만든다(자동 회원가입).
   */
  async loginWithGoogle(code: string) {
    const googleUser = await this.googleOAuthClient.getUserInfo(code);

    const existingOAuth = await this.prisma.oAuth.findFirst({
      where: {
        providerKey: googleUser.sub,
        provider: { provider: GOOGLE_PROVIDER },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      return this.issueTokens(existingOAuth.user);
    }

    const provider = await this.prisma.oAuthProvider.upsert({
      where: { provider: GOOGLE_PROVIDER },
      create: { provider: GOOGLE_PROVIDER },
      update: {},
    });

    const user =
      (await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      })) ??
      (await this.prisma.user.create({
        data: { email: googleUser.email, name: googleUser.name },
      }));

    await this.prisma.oAuth.create({
      data: {
        providerId: provider.id,
        providerKey: googleUser.sub,
        userId: user.id,
      },
    });

    return this.issueTokens(user);
  }

  async issueTokens(user: { id: number; email: string }) {
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '14d';
    const refreshExpiresInSec = parseDurationToMs(refreshExpiresIn) / 1000;

    // sessionId를 payload에 넣어야 해서, 먼저 임시 값으로 세션 행을 만들고
    // 실제 refresh token을 발급한 뒤 그 해시로 갱신한다.
    const session = await this.prisma.loginSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: '',
        expiresAt: new Date(Date.now() + refreshExpiresInSec * 1000),
      },
    });

    return this.signTokenPair(user, session.id);
  }

  /**
   * refresh token으로 새 access/refresh 토큰을 발급한다(토큰 회전).
   *
   * JWT 서명·만료는 RefreshJwtStrategy가 이미 검증했지만, 그것만으로는
   * "로그아웃했거나 이미 한 번 회전으로 무효화된 refresh token"을 걸러낼
   * 수 없다 — 서명 자체는 만료 전까지 계속 유효하기 때문이다. 그래서
   * LoginSession에 저장된 해시와 원본 토큰을 직접 대조한다.
   *
   * 해시가 안 맞으면 — 이미 회전된(탈취돼 재사용됐을 가능성이 있는)
   * refresh token이라는 뜻이라 세션 자체를 지워서 그 기기는 재로그인을
   * 하게 만든다. 토큰 탈취 탐지의 표준적인 방식이다.
   */
  async refreshTokens(
    userId: number,
    sessionId: number,
    rawRefreshToken: string,
  ) {
    const session = await this.prisma.loginSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new BusinessException(AuthErrorCode.INVALID_REFRESH_TOKEN);
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.loginSession.delete({ where: { id: sessionId } });
      throw new BusinessException(AuthErrorCode.INVALID_REFRESH_TOKEN);
    }

    const isMatch = refreshTokenMatches(
      rawRefreshToken,
      session.refreshTokenHash,
    );

    if (!isMatch) {
      await this.prisma.loginSession.delete({ where: { id: sessionId } });
      throw new BusinessException(AuthErrorCode.INVALID_REFRESH_TOKEN);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      await this.prisma.loginSession.delete({ where: { id: sessionId } });
      throw new BusinessException(AuthErrorCode.INVALID_REFRESH_TOKEN);
    }

    return this.signTokenPair(user, session.id);
  }

  /**
   * 현재 기기의 로그인 세션을 종료한다.
   *
   * LoginSession 행을 지우기만 하면 된다 — refreshTokens()의 ①③번
   * 검사가 "세션이 없다"/"해시가 안 맞는다"로 자동으로 걸러주므로,
   * 이 세션의 refresh token은 그 즉시 재사용이 불가능해진다.
   *
   * access token은 무상태(stateless) JWT라 여기서 즉시 무효화할 수는
   * 없다 — 남은 유효시간(최대 accessExpiresIn, 기본 15분) 동안은 계속
   * 통과한다. 그 정도 노출은 access token을 짧게 유지하는 것으로
   * 감수하는 게 이 프로젝트의 설계다(블랙리스트 인프라 없음).
   *
   * deleteMany를 쓰는 이유는 idempotent하게 만들기 위해서다 — 이미
   * 삭제된 세션(중복 로그아웃 클릭 등)에 delete()를 쓰면 P2025로
   * 터지는데, 로그아웃은 "이미 로그아웃돼 있어도 성공"이어야 한다.
   */
  async logout(sessionId: number): Promise<void> {
    await this.prisma.loginSession.deleteMany({ where: { id: sessionId } });
  }

  /**
   * 주어진 세션 id로 access/refresh 토큰 쌍을 서명하고, 그 refresh
   * token의 해시로 LoginSession을 갱신한다.
   *
   * issueTokens(새 세션 생성)와 refreshTokens(기존 세션 회전) 둘 다
   * "세션 하나를 정하고 그 세션 기준으로 토큰을 서명"하는 부분은
   * 동일해서 여기로 뺐다.
   */
  private async signTokenPair(
    user: { id: number; email: string },
    sessionId: number,
  ) {
    const accessSecret = this.configService.get<string>('jwt.accessSecret')!;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    const accessExpiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '14d';

    const accessExpiresInSec = parseDurationToMs(accessExpiresIn) / 1000;
    const refreshExpiresInSec = parseDurationToMs(refreshExpiresIn) / 1000;

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: accessSecret, expiresIn: accessExpiresInSec },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionId },
      { secret: refreshSecret, expiresIn: refreshExpiresInSec },
    );

    const refreshTokenHash = hashRefreshToken(refreshToken);

    await this.prisma.loginSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        expiresAt: new Date(Date.now() + refreshExpiresInSec * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiresInMs: refreshExpiresInSec * 1000,
    };
  }
}
