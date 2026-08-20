import {
  createParamDecorator,
  ExecutionContext,
  PipeTransform,
} from '@nestjs/common';
import type { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BusinessException } from '../../../common/exception/businessException';
import { UpdateDiaryDto } from '../dto/request/update-diary.dto';
import { DiariesErrorCode } from '../error/diaries.error';

const UPDATE_FIELDS = new Set([
  'date',
  'emotion',
  'buyReason',
  'goalPrice',
  'goalHoldPeriod',
  'customGoalHoldPeriod',
  'sellReasonCode',
  'sellReasonDetail',
  'goalEvaluationCode',
  'goalEvaluationDetail',
  'memo',
]);

/** 전역 ValidationPipe 대신 PATCH 전용 오류 코드를 적용할 원본 Body를 꺼낸다. */
export const UpdateDiaryBody = createParamDecorator(
  (_data: unknown, context: ExecutionContext): unknown =>
    context.switchToHttp().getRequest<Request>().body,
);

export class UpdateDiaryValidationPipe implements PipeTransform<
  unknown,
  Promise<UpdateDiaryDto>
> {
  async transform(value: unknown): Promise<UpdateDiaryDto> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BusinessException(DiariesErrorCode.INVALID_FIELD_VALUE);
    }

    const body = value as Record<string, unknown>;
    const keys = Object.keys(body);

    if (keys.length === 0) {
      throw new BusinessException(DiariesErrorCode.EMPTY_UPDATE_REQUEST);
    }

    if (keys.some((key) => !UPDATE_FIELDS.has(key))) {
      throw new BusinessException(DiariesErrorCode.INVALID_DIARY_UPDATE);
    }

    const request = plainToInstance(UpdateDiaryDto, body);
    const errors = await validate(request, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BusinessException(DiariesErrorCode.INVALID_FIELD_VALUE);
    }

    return request;
  }
}
