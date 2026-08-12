import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from '../../common/exception/errorDefinition';

export const DiariesErrorCode = defineErrorCodes({
  INVALID_DATE_RANGE: {
    code: 'INVALID_DATE_RANGE',
    status: HttpStatus.BAD_REQUEST,
    message: '조회 기간 조건이 올바르지 않습니다.',
  },
  INVALID_QUERY_PARAMETER: {
    code: 'INVALID_QUERY_PARAMETER',
    status: HttpStatus.BAD_REQUEST,
    message: '조회 조건이 올바르지 않습니다.',
  },
});
