import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const UsersInfoErrorCode = defineErrorCodes({
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '사용자를 찾을 수 없습니다.',
  },
});
