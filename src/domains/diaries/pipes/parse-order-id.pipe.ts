import { Injectable, PipeTransform } from '@nestjs/common';
import { BusinessException } from '../../../common/exception/businessException';
import { DiariesErrorCode } from '../error/diaries.error';

@Injectable()
export class ParseOrderIdPipe implements PipeTransform<
  string | undefined,
  number
> {
  transform(value: string | undefined): number {
    if (value === undefined || !/^[1-9]\d*$/.test(value)) {
      throw new BusinessException(DiariesErrorCode.INVALID_ORDER_ID, {
        value: value ?? null,
      });
    }

    const orderId = Number(value);

    if (!Number.isSafeInteger(orderId)) {
      throw new BusinessException(DiariesErrorCode.INVALID_ORDER_ID, { value });
    }

    return orderId;
  }
}
