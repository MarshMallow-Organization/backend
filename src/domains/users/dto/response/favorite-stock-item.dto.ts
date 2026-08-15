import { ApiProperty } from '@nestjs/swagger';

/** 관심종목 항목. 목록·등록·등록 여부 조회 응답이 공유한다. */
export class FavoriteStockItemDto {
  @ApiProperty({
    description: '관심종목 등록 ID. 종목 코드가 아니라 등록 행의 식별자다.',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '종목 코드. 국내 종목 기준 6자리 숫자.',
    pattern: '^\\d{6}$',
    example: '005930',
  })
  stockCode: string;

  /** 등록 시점에 클라이언트가 보낸 값을 그대로 보관한다. */
  @ApiProperty({
    description:
      '종목명. 등록 시점에 클라이언트가 보낸 값을 서버가 대조 없이 그대로 보관한 것이다.',
    example: '삼성전자',
  })
  stockName: string;

  /**
   * 시장 구분 (KOSPI / KOSDAQ 등). **현재 항상 null이다.**
   *
   * FavoriteStock 모델에 컬럼이 없고 종목 마스터도 없어 채울 수 없다.
   * 종목 조회 서비스가 연동되면 값이 들어간다. 필드 존재 자체는 지금부터
   * 보장하므로 프론트는 나중에 타입을 바꿀 필요가 없다.
   */
  @ApiProperty({
    description:
      '시장 구분(KOSPI / KOSDAQ 등). **현재는 항상 null이다** — 종목 마스터가 없어 채울 수 없다. 종목 조회 서비스가 연동되면 값이 들어간다.',
    type: String,
    nullable: true,
    example: null,
  })
  market: string | null;

  /** ISO 8601. Prisma의 Date를 서비스에서 문자열로 변환해 담는다. */
  @ApiProperty({
    description: '관심종목으로 등록한 시각 (ISO 8601).',
    format: 'date-time',
    example: '2026-08-15T09:12:33.000Z',
  })
  createdAt: string;
}
