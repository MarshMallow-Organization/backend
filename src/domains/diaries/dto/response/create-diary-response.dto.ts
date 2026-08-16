import { DiaryType } from '../../models/diary.model';

export class CreateDiaryResponseDto {
  diaryId: number;
  orderId: number;
  type: DiaryType;
  date: string;
  createdAt: string;
}
