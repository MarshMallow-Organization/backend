import { BusinessException } from '../../../common/exception/businessException';
import { DiaryIdPipe } from './diary-id.pipe';

describe('DiaryIdPipe', () => {
  const pipe = new DiaryIdPipe();

  it('양의 정수 문자열을 숫자로 변환한다', () => {
    expect(pipe.transform('12')).toBe(12);
  });

  it.each(['0', '-1', '1.5', 'abc'])(
    '%s는 INVALID_DIARY_ID를 던진다',
    (value) => {
      try {
        pipe.transform(value);
        throw new Error('Expected BusinessException');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).definition.code).toBe(
          'INVALID_DIARY_ID',
        );
      }
    },
  );
});
