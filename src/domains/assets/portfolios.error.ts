import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

/**
 * 가상계좌(virtual portfolio) 에러 카탈로그.
 *
 * assets 도메인에는 portfolios 외에 summary·holdings가 들어올 예정이라
 * 리소스 단위로 파일을 나눈다. 컨트롤러를 나눈 이유와 같다.
 *
 * message는 클라이언트에 그대로 노출되므로 사용자 관점의 문구만 담고,
 * portfolioId·name 같은 조사용 값은 BusinessException의 labels로 넘긴다.
 */
export const PortfoliosErrorCode = defineErrorCodes({
  PORTFOLIO_NAME_DUPLICATED: {
    code: 'PORTFOLIO_NAME_DUPLICATED',
    status: HttpStatus.CONFLICT,
    message: '이미 같은 이름의 가상계좌가 있습니다.',
  },

  /** 명세: 사용자당 가상계좌는 최대 4개까지. */
  PORTFOLIO_LIMIT_EXCEEDED: {
    code: 'PORTFOLIO_LIMIT_EXCEEDED',
    status: HttpStatus.CONFLICT,
    message: '가상계좌는 최대 4개까지 생성할 수 있습니다.',
  },
});
