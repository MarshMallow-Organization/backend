import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

/**
 * 보유종목(holdings) 에러 카탈로그.
 *
 * 실제 토스 holdings 연동 전까지는 HOLDINGS_UNAVAILABLE 하나뿐이다.
 * 연동 후 토스 API 자체가 실패하는 경우(429/500 등)를 다룰 코드는
 * 그때 추가한다.
 */
export const HoldingsErrorCode = defineErrorCodes({
  /**
   * 배포 환경에서 HOLDINGS_STUB_ENABLED를 켜지 않았거나, 실제 연동이
   * 아직 없는 상태에서 스텁도 꺼진 경우. 모든 사용자에게 같은 가짜
   * 자산이 노출되는 사고를 막기 위한 안전장치다.
   */
  HOLDINGS_UNAVAILABLE: {
    code: 'HOLDINGS_UNAVAILABLE',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: '보유 종목 조회 기능을 일시적으로 사용할 수 없습니다.',
  },
});
