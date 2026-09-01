import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exception/businessException';
import { AuthErrorCode } from './auth-error-code';
import { SignupDto } from './dto/signup.dto';
import { GoogleOAuthClient } from './google-oauth.client';

const SALT_ROUNDS = 10;

/** OAuthProvider.provider 값. 지금은 구글 하나뿐이라 여기 상수로만 둔다. */
const GOOGLE_PROVIDER = 'google';

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
    const accessSecret = this.configService.get<string>('jwt.accessSecret')!;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    const accessExpiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '14d';

    const accessExpiresInSec = parseDurationToMs(accessExpiresIn) / 1000;
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

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: accessSecret, expiresIn: accessExpiresInSec },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionId: session.id },
      { secret: refreshSecret, expiresIn: refreshExpiresInSec },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);

    await this.prisma.loginSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiresInMs: refreshExpiresInSec * 1000,
    };
  }
}
