import { ApiProperty } from '@nestjs/swagger';

/** DELETE /assets/portfolios/:portfolioId 응답. */
export class PortfolioDeletedDto {
  @ApiProperty({
    description: '삭제한 가상계좌 ID.',
    example: 12,
  })
  id: number;

  /**
   * 항상 true다. 삭제에 실패하면 예외가 나가므로 false가 담길 일은 없다.
   *
   * 명세가 이 필드를 required로 둔 이유는 응답 본문을 비우지 않기 위해서다.
   * 204 No Content 대신 200 + 본문을 쓰면 ResponseInterceptor의 { data }
   * 형식이 모든 엔드포인트에서 일관되게 유지된다.
   */
  @ApiProperty({
    description:
      '항상 true다. 삭제에 실패하면 예외가 나가므로 false가 담길 일은 없다. 204 대신 200 + 본문을 쓰는 이유는 `{ data }` 응답 형식을 모든 엔드포인트에서 일관되게 유지하기 위해서다.',
    example: true,
  })
  deleted: boolean;
}
