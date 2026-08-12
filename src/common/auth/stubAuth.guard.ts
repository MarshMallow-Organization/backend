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
 * 안전장치: APP_ENV가 local이 아니면 항상 401을 던져 닫힌다(fail closed).
 * 실수로 배포돼도 인증 우회로 쓰이지 않는다.
 *
 * @example
 * curl -H 'x-stub-user-id: 3' localhost:3000/assets/portfolios
 */
@Injectable()
export class StubAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    /** local이 아니면 스텁이 동작하지 않는다. 인증 우회 방지. */
    if (this.configService.get<string>('app.env') !== 'local') {
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
