import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exception/businessException';
import { AuthErrorCode } from './auth-error-code';
import { SignupDto } from './dto/signup.dto';

const SALT_ROUNDS = 10;

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
