import { BusinessException } from '../../../common/exception/businessException';
import { UpdateDiaryValidationPipe } from './update-diary-validation.pipe';

describe('UpdateDiaryValidationPipe', () => {
  const pipe = new UpdateDiaryValidationPipe();

  it.each([
    [{}, 'EMPTY_UPDATE_REQUEST'],
    [{ orderId: 12 }, 'INVALID_DIARY_UPDATE'],
    [{ emotion: 6 }, 'INVALID_FIELD_VALUE'],
    [{ buyReason: null }, 'INVALID_FIELD_VALUE'],
  ])('잘못된 요청 %p를 %s로 반환한다', async (body, code) => {
    try {
      await pipe.transform(body);
      throw new Error('Expected BusinessException');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).definition.code).toBe(code);
    }
  });

  it('nullable 필드의 null은 삭제 요청으로 유지한다', async () => {
    await expect(pipe.transform({ memo: null })).resolves.toMatchObject({
      memo: null,
    });
  });
});
