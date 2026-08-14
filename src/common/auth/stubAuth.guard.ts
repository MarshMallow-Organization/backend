import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AUTH_USER_REQUEST_KEY, AuthUser } from './authUser';

/** 로컬에서 사용자를 바꿔가며 테스트할 때 쓰는 헤더. */
const STUB_USER_HEADER = 'x-stub-user-id';

/** 헤더를 주지 않았을 때 사용할 기본 사용자. seed의 1번 사용자를 가정한다. */
const DEFAULT_STUB_USER_ID = 1;

/**
 * ⚠️ 임시 스텁이다. 실제 JWT 인증(/auths, 담당: 민수)이 붙으면 통째로 지운다.
 *
 * 토큰을 검증하지 않고 헤더(x-stub-user-id) 또는 기본값으로 userId를 채운다.
 * 인증을 요구하는 엔드포인트를 auth 구현 전에도 개발·테스트하기 위한 장치다.
 *
 * 안전장치: STUB_AUTH_ENABLED=true를 명시적으로 넣어야만 동작한다.
 * 기본값이 꺼짐이라 환경변수를 설정하지 않은 배포는 401로 닫힌다.
 *
 * @example
 * curl -H 'x-stub-user-id: 3' localhost:3000/assets/portfolios
 */
@Injectable()
export class StubAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    /**
     * APP_ENV는 미설정 시 'local'로 채워지므로 판정 기준이 될 수 없다.
     * 깜빡한 배포가 인증 우회가 되지 않도록 별도 플래그를 요구한다.
     */
    if (!this.configService.get<boolean>('auth.stubEnabled')) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.header(STUB_USER_HEADER);
    const userId = header ? Number(header) : DEFAULT_STUB_USER_ID;

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    const authUser: AuthUser = { id: userId };
    request[AUTH_USER_REQUEST_KEY] = authUser;

    return true;
  }
}
