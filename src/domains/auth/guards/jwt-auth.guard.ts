import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AUTH_USER_REQUEST_KEY, AuthUser } from 'src/common/auth/authUser';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = await super.canActivate(context);
    if (!isValid) {
      return false;
    }

    const request = context.switchToHttp().getRequest<Request>();
    request[AUTH_USER_REQUEST_KEY] = request.user as AuthUser;

    return true;
  }
}
