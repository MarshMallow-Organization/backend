import { DiaryPreviewDto } from './diary-preview.dto'

export class GetDiariesResponseDto {
  items: DiaryPreviewDto[];

  page: number;
  size: number;

  totalElements: number;
  totalPages: number;

  hasNext: boolean;
}