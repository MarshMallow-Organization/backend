import { ApiProperty } from '@nestjs/swagger';
import { PortfolioSummaryDto } from './portfolio-summary.dto';

/** GET /assets/portfolios 응답. */
export class PortfolioListResponseDto {
  @ApiProperty({
    description: 'sortOrder 오름차순으로 정렬된 가상계좌 목록.',
    type: [PortfolioSummaryDto],
  })
  portfolios: PortfolioSummaryDto[];

  /**
   * 생성 가능한 최대 개수. 목록이 비어 있어도 항상 포함한다.
   * 프론트가 '추가' 버튼을 막는 기준으로 쓴다.
   */
  @ApiProperty({
    description:
      "생성 가능한 최대 개수. 목록이 비어 있어도 항상 포함한다. 프론트가 '추가' 버튼을 막는 기준으로 쓴다.",
    example: 4,
  })
  maxCount: number;
}
