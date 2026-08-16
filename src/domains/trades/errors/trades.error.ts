import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const TradesErrorCode = defineErrorCodes({
  // 404: 체결 내역을 찾을 수 없거나 접근 권한이 없는 경우
  TRADE_NOT_FOUND: {
    code: 'TRADE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '해당 체결 내역을 찾을 수 없거나 접근 권한이 없습니다.',
  },

  // 409: 이미 등록된 외부 체결 번호인 경우
  DUPLICATE_EXTERNAL_TRADE_ID: {
    code: 'DUPLICATE_EXTERNAL_TRADE_ID',
    status: HttpStatus.CONFLICT,
    message: '이미 등록된 외부 체결 번호입니다.',
  },

  // 404: 체결 대상 원주문(Order)을 찾을 수 없는 경우
  ORDER_NOT_FOUND_FOR_TRADE: {
    code: 'ORDER_NOT_FOUND_FOR_TRADE',
    status: HttpStatus.NOT_FOUND,
    message: '체결 대상 주문(Order)을 찾을 수 없거나 접근 권한이 없습니다.',
  },

  // 400: 체결 가격 또는 수량이 0 이하인 경우
  INVALID_TRADE_PRICE_OR_QUANTITY: {
    code: 'INVALID_TRADE_PRICE_OR_QUANTITY',
    status: HttpStatus.BAD_REQUEST,
    message: '체결 단가 및 수량은 0보다 커야 합니다.',
  },

  // 404: 존재하지 않는 지원 통화 ID인 경우
  CURRENCY_NOT_FOUND: {
    code: 'CURRENCY_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '존재하지 않는 지원 통화 ID입니다.',
  },
});
