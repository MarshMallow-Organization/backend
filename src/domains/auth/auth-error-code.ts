import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const AuthErrorCode = defineErrorCodes({
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    status: HttpStatus.CONFLICT,
    message: '이미 가입된 이메일입니다.',
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    status: HttpStatus.UNAUTHORIZED,
    message: '이메일 또는 비밀번호가 올바르지 않습니다.',
  },
  PASSWORD_NOT_SET: {
    code: 'PASSWORD_NOT_SET',
    status: HttpStatus.UNAUTHORIZED,
    message:
      '소셜 로그인으로 가입된 계정입니다. 비밀번호 로그인을 사용할 수 없습니다.',
  },
  GOOGLE_AUTH_FAILED: {
    code: 'GOOGLE_AUTH_FAILED',
    status: HttpStatus.UNAUTHORIZED,
    message: '구글 인증에 실패했습니다.',
  },
  INVALID_REFRESH_TOKEN: {
    code: 'INVALID_REFRESH_TOKEN',
    status: HttpStatus.UNAUTHORIZED,
    message: '세션이 만료되었습니다. 다시 로그인해주세요.',
  },
});
