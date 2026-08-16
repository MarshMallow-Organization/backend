import { PipeTransform } from '@nestjs/common';
import { BusinessException } from '../../../common/exception/businessException';
import { DiariesErrorCode } from '../error/diaries.error';

export class DiaryIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const diaryId = Number(value);

    if (!Number.isInteger(diaryId) || diaryId < 1) {
      throw new BusinessException(DiariesErrorCode.INVALID_DIARY_ID, { value });
    }

    return diaryId;
  }
}
