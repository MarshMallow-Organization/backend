import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const MarketsErrorCode = defineErrorCodes({
  INVALID_STOCK_CODE: {
    code: 'INVALID_STOCK_CODE',
    status: HttpStatus.BAD_REQUEST,
    message: 'stockCode가 입력되지 않았거나 잘못 입력되었습니다.',
  },

  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    status: HttpStatus.UNAUTHORIZED,
    message: '인증이 필요합니다.',
  },

  NOT_FOUND_STOCK: {
    code: 'NOT_FOUND_STOCK',
    status: HttpStatus.NOT_FOUND,
    message: '존재하지 않는 종목입니다.',
  },

  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '서버 내부 오류가 발생했습니다',
  },
});
