import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

/**
 * 보유종목(holdings) 에러 카탈로그.
 *
 * 자격 증명 자체가 없는 경우(TossAccount 미연동)는 이미
 * TossErrorCode.ACCOUNT_NOT_CONNECTED(src/domains/api/clients/toss/toss.error.ts)가
 * 있어 그대로 재사용한다. 여기는 자격 증명은 있는데 그 다음 단계에서
 * 걸리는, holdings 도메인 고유의 케이스만 정의한다. 토스 API 자체가
 * 실패하는 경우(401/429/500 등)는 throwTossException()이 동적으로
 * 만들어 던지므로 여기서 미리 정의하지 않는다.
 */
export const HoldingsErrorCode = defineErrorCodes({
  /** 계좌 목록 조회는 성공했지만 연동된 증권 계좌가 하나도 없는 경우. */
  NO_BROKERAGE_ACCOUNT: {
    code: 'HOLDINGS_NO_BROKERAGE_ACCOUNT',
    status: HttpStatus.BAD_REQUEST,
    message: '연동된 증권 계좌가 없습니다.',
  },
});
