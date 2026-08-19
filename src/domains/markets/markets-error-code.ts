import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const MarketsErrorCode = defineErrorCodes({
  NOT_FOUND_STOCK: {
    code: 'NOT_FOUND_STOCK',
    status: HttpStatus.NOT_FOUND,
    message: '존재하지 않는 종목입니다.',
  },

  /*
  ParseStockCodePipe로 대체
  INVALID_STOCK_CODE: {
    code: 'INVALID_STOCK_CODE',
    status: HttpStatus.BAD_REQUEST,
    message: 'stockCode가 입력되지 않았거나 잘못 입력되었습니다.',
  },

  StubAuthGuard로 대체
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    status: HttpStatus.UNAUTHORIZED,
    message: '인증이 필요합니다.',
  },

  /* allException.filter로 대체
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '서버 내부 오류가 발생했습니다',
  },
*/
});
