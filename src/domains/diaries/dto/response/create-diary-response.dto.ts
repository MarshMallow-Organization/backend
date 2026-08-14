import { DiaryType } from '../request/post-diaries.dto';

export class CreateDiaryResponseDto {
  diaryId: number;
  orderId: number;
  type: DiaryType;
  date: string;
  createdAt: string;
}
