import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const MarketsErrorCode = defineErrorCodes({
  NOT_FOUND_STOCK: {
    code: 'NOT_FOUND_STOCK',
    status: HttpStatus.NOT_FOUND,
    message: '존재하지 않는 종목입니다.',
  },

  UNSUPPORTED_RANKING_DURATION: {
    code: 'UNSUPPORTED_RANKING_DURATION',
    status: HttpStatus.BAD_REQUEST,
    message: '해당 랭킹 유형은 실시간 조회를 지원하지 않습니다.',
  },
});
