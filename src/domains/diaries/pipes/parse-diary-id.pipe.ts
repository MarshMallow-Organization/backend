import { Injectable, PipeTransform } from '@nestjs/common';
import { BusinessException } from '../../../common/exception/businessException';
import { DiariesErrorCode } from '../error/diaries.error';

@Injectable()
export class ParseDiaryIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new BusinessException(DiariesErrorCode.INVALID_DIARY_ID, { value });
    }

    const diaryId = Number(value);

    if (!Number.isSafeInteger(diaryId)) {
      throw new BusinessException(DiariesErrorCode.INVALID_DIARY_ID, { value });
    }

    return diaryId;
  }
}
