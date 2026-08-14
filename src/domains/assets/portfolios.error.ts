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
  /**
   * 존재하지 않거나 남의 계좌인 경우 모두 이 코드다.
   *
   * 403으로 나누면 "그 ID는 존재하지만 네 것이 아니다"가 노출되어
   * 남의 계좌 존재 여부를 캐낼 수 있다.
   */
  PORTFOLIO_NOT_FOUND: {
    code: 'PORTFOLIO_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '가상계좌를 찾을 수 없습니다.',
  },

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

  /**
   * 순서 변경 요청이 보유 목록과 어긋난 경우.
   *
   * 중복·남의 계좌·개수 불일치를 하나로 묶는다. 어느 쪽이 틀렸는지 나누면
   * 남의 계좌 ID가 존재하는지를 응답으로 확인할 수 있게 된다.
   */
  PORTFOLIO_ORDER_MISMATCH: {
    code: 'PORTFOLIO_ORDER_MISMATCH',
    status: HttpStatus.BAD_REQUEST,
    message: '보유한 가상계좌 전체를 중복 없이 전달해야 합니다.',
  },
});
