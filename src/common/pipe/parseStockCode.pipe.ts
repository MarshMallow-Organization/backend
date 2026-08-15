import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** 명세(openapi.yaml components/parameters/StockCode): 국내 종목 기준 6자리 숫자. */
const STOCK_CODE_PATTERN = /^\d{6}$/;

/**
 * 경로 파라미터 stockCode의 형식을 검증한다.
 *
 * 전역 ValidationPipe는 DTO가 붙는 @Body·@Query만 훑기 때문에 경로
 * 파라미터는 아무 검증 없이 서비스까지 내려간다. 그대로 두면 형식이 틀린
 * 코드가 '조회했더니 없더라'로 흘러 404가 되는데, 명세는 형식 오류를
 * 400으로 요구한다(components/responses/BadRequest).
 *
 * BadRequestException을 던지면 AllExceptionsFilter가 code BAD_REQUEST로
 * 변환하므로, DTO 검증 실패와 같은 형태의 응답이 나간다.
 *
 * stockCode를 경로에 쓰는 곳은 관심종목 외에 가상계좌 종목 제거
 * (DELETE /assets/portfolios/{portfolioId}/stocks/{stockCode})도 있어서
 * 도메인이 아니라 common에 둔다.
 *
 * @example
 * findOne(@Param('stockCode', ParseStockCodePipe) stockCode: string) {}
 */
@Injectable()
export class ParseStockCodePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!STOCK_CODE_PATTERN.test(value)) {
      throw new BadRequestException('stockCode는 6자리 숫자여야 합니다.');
    }

    return value;
  }
}
