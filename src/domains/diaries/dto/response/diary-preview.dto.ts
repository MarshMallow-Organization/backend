import { ApiProperty } from '@nestjs/swagger';

export class DiaryPreviewDto {
  /** 일기 ID. @example 1 */
  diaryId: number;
  /** 일기의 기준 주문 ID. @example 12 */
  orderId: number;
  /** 매수·매도 유형. @example BUY */
  type: 'BUY' | 'SELL';
  /** 거래일. @example 2026-07-30 */
  date: string;
  /** 종목 코드. @example 005930 */
  corpCode: string;
  /** 종목 이름. @example 삼성전자 */
  corpName: string;
  /** 평균 거래 가격. 미체결 주문은 주문 가격을 사용한다. */
  @ApiProperty({ example: 72000, nullable: true })
  avgPrice: number | null;
  /** 거래 수량. @example 10 */
  quantity: number;
  /** 작성 메모. */
  @ApiProperty({ example: '실적 발표 후 매수', nullable: true })
  memo: string | null;
  /** 생성 시각(ISO 8601). @example 2026-07-30T16:10:00.000Z */
  createdAt: string;
}
