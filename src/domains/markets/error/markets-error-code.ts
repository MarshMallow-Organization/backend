import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const MarketsErrorCode = defineErrorCodes({
  NOT_FOUND_STOCK: {
    code: 'NOT_FOUND_STOCK',
    status: HttpStatus.NOT_FOUND,
    message: '존재하지 않는 종목입니다.',
  },
});
