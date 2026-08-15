import { HttpStatus } from '@nestjs/common';
import { defineErrorCodes } from 'src/common/exception/errorDefinition';

/**
 * 관심종목(favorite stock) 에러 카탈로그.
 *
 * users 도메인에는 관심종목 외에 숨김종목이 들어올 예정이라
 * 리소스 단위로 파일을 나눈다. assets/portfolios.error.ts와 같은 방식이다.
 *
 * message는 클라이언트에 그대로 노출되므로 사용자 관점의 문구만 담고,
 * stockCode 같은 조사용 값은 BusinessException의 labels로 넘긴다.
 *
 * 명세의 STOCK_NOT_FOUND(404)는 여기 없다. 종목 마스터가 없어 실재 여부를
 * 판정할 수 없어서, 명세가 정한 잠정안대로 DTO의 6자리 형식 검증으로
 * 대체한다. 종목 조회 서비스가 연동되면 그때 추가한다.
 */
export const FavoriteStocksErrorCode = defineErrorCodes({
  FAVORITE_STOCK_ALREADY_EXISTS: {
    code: 'FAVORITE_STOCK_ALREADY_EXISTS',
    status: HttpStatus.CONFLICT,
    message: '이미 등록된 관심종목입니다.',
  },

  FAVORITE_STOCK_NOT_FOUND: {
    code: 'FAVORITE_STOCK_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '등록된 관심종목이 아닙니다.',
  },
});
