import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

export const OrdersErrorCode = defineErrorCodes({
  // 404: 주문을 찾을 수 없거나 타인의 주문인 경우
  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '해당 주문을 찾을 수 없거나 접근 권한이 없습니다.',
  },

  // 409: PENDING 상태가 아니라서 수정할 수 없는 경우
  ORDER_NOT_EDITABLE: {
    code: 'ORDER_NOT_EDITABLE',
    status: HttpStatus.CONFLICT,
    message: 'PENDING 상태의 주문만 수정할 수 있습니다.',
  },

  // 409: PENDING 상태가 아니라서 취소할 수 없는 경우
  ORDER_NOT_CANCELABLE: {
    code: 'ORDER_NOT_CANCELABLE',
    status: HttpStatus.CONFLICT,
    message: 'PENDING 상태의 주문만 취소할 수 있습니다.',
  },

  // 400: 조건부 주문인데 필수 데이터(triggerPrice, expiredAt)가 누락된 경우
  INVALID_ORDER_CONDITION: {
    code: 'INVALID_ORDER_CONDITION',
    status: HttpStatus.BAD_REQUEST,
    message:
      '조건부 주문의 경우 감시 목표가(triggerPrice)와 만료일(expiredAt)이 필수입니다.',
  },

  // 400: 일반 주문인데 orderCondition 데이터를 포함해서 요청한 경우
  GENERAL_ORDER_CANNOT_HAVE_CONDITION: {
    code: 'GENERAL_ORDER_CANNOT_HAVE_CONDITION',
    status: HttpStatus.BAD_REQUEST,
    message: '일반 주문 해당 정보를 가지지 않습니다.',
  },

  // 404: 존재하지 않는 지원 통화 ID인 경우
  CURRENCY_NOT_FOUND: {
    code: 'CURRENCY_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '존재하지 않는 지원 통화 ID입니다.',
  },
});
