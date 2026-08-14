import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_USER_REQUEST_KEY, AuthUser } from './authUser';

/**
 * 인증된 사용자를 핸들러 인자로 꺼낸다.
 *
 * 가드가 채워둔 값을 읽기만 하므로, 지금의 StubAuthGuard가 실제 JWT 가드로
 * 바뀌어도 이 데코레이터를 쓰는 컨트롤러는 고칠 필요가 없다.
 *
 * @example
 * @Get()
 * findAll(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<Request>();
    const authUser = request[AUTH_USER_REQUEST_KEY] as AuthUser | undefined;

    /**
     * 가드를 붙이지 않은 핸들러에서 이 데코레이터를 쓴 설정 실수다.
     * userId 없이 조회하면 남의 데이터가 섞이므로 조용히 넘기지 않는다.
     */
    if (!authUser) {
      throw new InternalServerErrorException(
        'CurrentUser를 사용하려면 인증 가드가 필요합니다.',
      );
    }

    return authUser;
  },
);
