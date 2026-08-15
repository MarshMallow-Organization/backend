import { DiaryPreviewDto } from './diary-preview.dto';

export class GetDiariesResponseDto {
  /** 조회된 일기 목록. */
  items: DiaryPreviewDto[];

  /** 현재 페이지 번호. @example 0 */
  page: number;
  /** 페이지 크기. @example 10 */
  size: number;

  /** 필터 조건에 해당하는 전체 일기 수. @example 32 */
  totalElements: number;
  /** 전체 페이지 수. @example 4 */
  totalPages: number;

  /** 다음 페이지 존재 여부. @example true */
  hasNext: boolean;
}
