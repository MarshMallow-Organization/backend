import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

/**
 * /assets 도메인 에러 카탈로그.
 *
 * message는 클라이언트에 그대로 노출되므로 사용자 관점의 문구만 담고,
 * portfolioId·stockCode 같은 조사용 값은 BusinessException의 labels로 넘긴다.
 */
export const AssetsErrorCode = defineErrorCodes({
  PORTFOLIO_NOT_FOUND: {
    code: 'PORTFOLIO_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '가상계좌를 찾을 수 없습니다.',
  },

  /**
   * 남의 가상계좌에 접근한 경우.
   *
   * 403이 아니라 404로 내려 존재 여부 자체를 숨긴다. id를 훑어서 다른 사용자의
   * 계좌가 있는지 알아내지 못하게 하려는 의도다.
   */
  PORTFOLIO_FORBIDDEN: {
    code: 'PORTFOLIO_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '가상계좌를 찾을 수 없습니다.',
  },

  PORTFOLIO_NAME_DUPLICATED: {
    code: 'PORTFOLIO_NAME_DUPLICATED',
    status: HttpStatus.CONFLICT,
    message: '이미 같은 이름의 가상계좌가 있습니다.',
  },

  PORTFOLIO_STOCK_DUPLICATED: {
    code: 'PORTFOLIO_STOCK_DUPLICATED',
    status: HttpStatus.CONFLICT,
    message: '이미 가상계좌에 담긴 종목입니다.',
  },

  /** 명세: 사용자당 가상계좌는 최대 4개까지. */
  PORTFOLIO_LIMIT_EXCEEDED: {
    code: 'PORTFOLIO_LIMIT_EXCEEDED',
    status: HttpStatus.CONFLICT,
    message: '가상계좌는 최대 4개까지 생성할 수 있습니다.',
  },

  PORTFOLIO_STOCK_NOT_FOUND: {
    code: 'PORTFOLIO_STOCK_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '가상계좌에서 해당 종목을 찾을 수 없습니다.',
  },
});
