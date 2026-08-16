import { BusinessException } from '../../../common/exception/businessException';
import { ParseDiaryIdPipe } from './parse-diary-id.pipe';

describe('ParseDiaryIdPipe', () => {
  const pipe = new ParseDiaryIdPipe();

  it('양의 정수 문자열을 숫자로 변환한다', () => {
    expect(pipe.transform('12')).toBe(12);
  });

  it.each(['0', '-1', '1.5', 'abc', ' 1', '01', '9007199254740992'])(
    '잘못된 diaryId %s에 INVALID_DIARY_ID를 던진다',
    (value) => {
      try {
        pipe.transform(value);
        throw new Error('BusinessException이 발생해야 합니다.');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).definition.code).toBe(
          'INVALID_DIARY_ID',
        );
      }
    },
  );
});
