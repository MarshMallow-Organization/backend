import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/** 명세(openapi.yaml components/parameters/StockCode): 국내 종목 기준 6자리 숫자. */
const STOCK_CODE_PATTERN = /^\d{6}$/;

/** 명세(openapi.yaml CreateFavoriteStockRequest): minLength 1, maxLength 100. */
const STOCK_NAME_MAX_LENGTH = 100;

/** 앞뒤 공백을 잘라낸다. 문자열이 아니면 그대로 두어 @IsString이 판정하게 한다. */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** POST /users/me/favorite-stocks 요청 본문. */
export class CreateFavoriteStockDto {
  /**
   * 종목 코드.
   *
   * 종목 마스터가 없어 실재하는 종목인지는 확인할 수 없다. 명세가 정한
   * 잠정안대로 6자리 숫자 형식만 검증한다. 종목 조회 서비스가 연동되면
   * 서비스 계층에 STOCK_NOT_FOUND(404) 판정이 추가된다.
   */
  @ApiProperty({
    description: '종목 코드. 국내 종목 기준 6자리 숫자.',
    pattern: '^\\d{6}$',
    example: '005930',
  })
  @IsString()
  @Transform(trim)
  @Matches(STOCK_CODE_PATTERN, {
    message: 'stockCode는 6자리 숫자여야 합니다.',
  })
  stockCode: string;

  /**
   * 종목명. 클라이언트 입력을 그대로 저장한다.
   *
   * 종목 상세 화면에서 등록하는 흐름이라 프론트가 이미 이름을 갖고 있고,
   * 종목 마스터가 없어 서버가 대조할 방법도 없다.
   */
  @ApiProperty({
    description: '종목명. 서버가 대조하지 않고 그대로 저장한다.',
    minLength: 1,
    maxLength: STOCK_NAME_MAX_LENGTH,
    example: '삼성전자',
  })
  @IsString()
  @Transform(trim)
  @IsNotEmpty({ message: 'stockName은 필수입니다' })
  @MaxLength(STOCK_NAME_MAX_LENGTH)
  stockName: string;
}
