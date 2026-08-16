import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from '../../../common/exception/errorDefinition';

export const DiariesErrorCode = defineErrorCodes({
  INVALID_DIARY_ID: {
    code: 'INVALID_DIARY_ID',
    status: HttpStatus.BAD_REQUEST,
    message: '일기 ID 형식이 올바르지 않습니다.',
  },
  DIARY_NOT_FOUND: {
    code: 'DIARY_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '해당 일기를 찾을 수 없습니다.',
  },
  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '주문을 찾을 수 없습니다.',
  },
  ORDER_TYPE_MISMATCH: {
    code: 'ORDER_TYPE_MISMATCH',
    status: HttpStatus.BAD_REQUEST,
    message: '주문 유형과 일기 유형이 일치하지 않습니다.',
  },
  DIARY_ALREADY_EXISTS: {
    code: 'DIARY_ALREADY_EXISTS',
    status: HttpStatus.CONFLICT,
    message: '해당 주문에 작성된 일기가 이미 존재합니다.',
  },
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
  EMPTY_UPDATE_REQUEST: {
    code: 'EMPTY_UPDATE_REQUEST',
    status: HttpStatus.BAD_REQUEST,
    message: '수정할 필드가 없습니다.',
  },
  INVALID_DIARY_UPDATE: {
    code: 'INVALID_DIARY_UPDATE',
    status: HttpStatus.BAD_REQUEST,
    message: '수정할 수 없는 필드가 포함되어 있습니다.',
  },
  INVALID_FIELD_VALUE: {
    code: 'INVALID_FIELD_VALUE',
    status: HttpStatus.BAD_REQUEST,
    message: '필드 값 또는 범위가 올바르지 않습니다.',
  },
});
