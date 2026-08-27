import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

/**
 * 토스 계좌 연동(toss-account) 에러 카탈로그.
 *
 * users 도메인 안에서 관심종목/숨김종목과 마찬가지로 리소스 단위로
 * 파일을 나눈다(favorite-stocks.error.ts와 같은 방식).
 */
export const TossAccountErrorCode = defineErrorCodes({
  /**
   * 입력받은 apiKey/secretKey로 토스 OAuth 토큰 발급을 시도했으나 실패한 경우.
   * TossClient가 던지는 BusinessException(TossErrorCode.AUTHENTICATION_FAILED)을
   * 이 코드로 다시 매핑한다 — "증권사 API 인증 실패"가 아니라
   * "네가 입력한 키가 틀렸다"는 맥락으로 좁혀준다.
   */
  INVALID_CREDENTIALS: {
    code: 'TOSS_ACCOUNT_INVALID_CREDENTIALS',
    status: HttpStatus.BAD_REQUEST,
    message: '토스 API 인증에 실패했습니다',
  },
});
