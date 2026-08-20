import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const UsersInfoErrorCode = defineErrorCodes({
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '사용자를 찾을 수 없습니다.',
  },
});

export const UsersInfoUpdateErrorCode = defineErrorCodes({
  BAD_REQUEST_NULL_VALUE: {
    code: 'BAD_REQUEST_NULL_VALUE',
    status: HttpStatus.BAD_REQUEST,
    message: 'name과 profileImageUrl이 입력되지 않았습니다.',
  },
});
