import { ApiProperty } from '@nestjs/swagger';

export class DeleteDiaryResponseDto {
  @ApiProperty({ example: 1 })
  diaryId: number;

  @ApiProperty({ example: true })
  deleted: true;

  @ApiProperty({
    example: '2026-08-05T01:15:00.000Z',
    description: '최초 soft delete 시각. 재요청에도 기존 값을 유지한다.',
  })
  deletedAt: string;
}
