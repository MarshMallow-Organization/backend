import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { REFRESH_COOKIE_NAME } from '../auth.constants';

interface RefreshTokenPayload {
  sub: number;
  sessionId: number;
}

/** RefreshAuthGuard 통과 후 req.user에 채워지는 값. */
export interface RefreshUser {
  id: number;
  sessionId: number;
  /**
   * 서명 검증만으로는 부족하다 — 회전으로 무효화된(이미 한 번 쓰인)
   * refresh token이어도 서명 자체는 여전히 유효하기 때문이다.
   * AuthService.refreshTokens()가 이 원본 문자열을 LoginSession의
   * 해시와 직접 비교해서 실제로 살아있는 토큰인지 확인한다.
   */
  rawRefreshToken: string;
}

/**
 * Authorization 헤더가 아니라 httpOnly 쿠키(refreshToken)에서 JWT를
 * 꺼내 jwt.refreshSecret으로 검증한다. JwtStrategy(access token,
 * 헤더)와는 시크릿·추출 위치가 달라 별도 전략으로 둔다.
 */
@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null =>
          (req.cookies as Record<string, string> | undefined)?.[
            REFRESH_COOKIE_NAME
          ] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload): RefreshUser {
    const rawRefreshToken = (req.cookies as Record<string, string>)[
      REFRESH_COOKIE_NAME
    ];

    return {
      id: payload.sub,
      sessionId: payload.sessionId,
      rawRefreshToken,
    };
  }
}
