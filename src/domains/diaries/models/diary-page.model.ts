import { DiaryPreviewDto } from '../dto/response/diary-preview.dto';

export type DiaryPageCriteria = {
  page: number;
  size: number;
  dates?: string[];
  startDate?: string;
  endDate?: string;
  companies?: string[];
  orderBy: readonly [{ date: 'desc' }, { diaryId: 'desc' }];
};

export type DiaryPageResult = {
  items: DiaryPreviewDto[];
  totalElements: number;
};
