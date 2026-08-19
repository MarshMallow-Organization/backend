import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from '@jest/globals';
import { PostHiddenStockDto } from './post-hidden-stock.dto';

describe('PostHiddenStockDto', () => {
  const validRequest = {
    stockCode: '005930',
    hiddenUntil: '2099-08-31T23:59:59.000Z',
  };

  const validateRequest = (request: Record<string, unknown>) => {
    const dto = plainToInstance(PostHiddenStockDto, request);

    return validate(dto);
  };

  it('유효한 요청이면 검증을 통과한다', async () => {
    await expect(validateRequest(validRequest)).resolves.toHaveLength(0);
  });

  it('최대 길이인 10자 stockCode를 허용한다', async () => {
    await expect(
      validateRequest({ ...validRequest, stockCode: 'A'.repeat(10) }),
    ).resolves.toHaveLength(0);
  });

  it('stockCode의 앞뒤 공백을 제거한다', async () => {
    const dto = plainToInstance(PostHiddenStockDto, {
      ...validRequest,
      stockCode: '  005930  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.stockCode).toBe('005930');
  });

  it.each([
    { stockCode: '', description: '빈 문자열' },
    { stockCode: '   ', description: '공백만 있는 문자열' },
    { stockCode: '005 930', description: '중간에 공백이 있는 문자열' },
    { stockCode: 'A'.repeat(11), description: '10자를 초과한 문자열' },
  ])('$description stockCode를 거부한다', async ({ stockCode }) => {
    const errors = await validateRequest({ ...validRequest, stockCode });

    expect(errors).not.toHaveLength(0);
  });

  it.each([
    { hiddenUntil: '', description: '빈 문자열' },
    { hiddenUntil: 'tomorrow', description: 'ISO 8601 형식이 아닌 값' },
  ])('$description hiddenUntil을 거부한다', async ({ hiddenUntil }) => {
    const errors = await validateRequest({ ...validRequest, hiddenUntil });

    expect(errors).not.toHaveLength(0);
  });
});
