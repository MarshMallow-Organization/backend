import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const HiddenStockErrorCode = defineErrorCodes({
  INVALID_HIDDEN_UNTIL: {
    code: 'INVALID_HIDDEN_UNTIL',
    status: HttpStatus.BAD_REQUEST,
    message: 'hiddenUntil이 입력되지 않았거나 잘못 입력되었습니다.',
  },

  HIDDEN_UNTIL_IN_PAST: {
    code: 'HIDDEN_UNTIL_IN_PAST',
    status: HttpStatus.BAD_REQUEST,
    message: 'hiddenUntil은 현재 시각 이후여야 합니다.',
  },

  CONFLICT: {
    code: 'CONFLICT',
    status: HttpStatus.CONFLICT,
    message: '이미 숨김 처리된 종목입니다.',
  },
});
