import { BadRequestException } from '@nestjs/common';
import { ParseStockCodePipe } from './parseStockCode.pipe';

describe('ParseStockCodePipe', () => {
  const pipe = new ParseStockCodePipe();

  it('6자리 숫자는 그대로 통과시킨다', () => {
    expect(pipe.transform('005930')).toBe('005930');
  });

  it('앞자리 0을 잃지 않는다', () => {
    /** 문자열로 다뤄야 한다. 숫자로 변환하면 5930이 되어 종목이 달라진다. */
    expect(pipe.transform('000660')).toBe('000660');
  });

  it.each([
    ['빈 문자열', ''],
    ['5자리', '00593'],
    ['7자리', '0059300'],
    ['영문 포함', '00593O'],
    ['공백 포함', '005 30'],
    ['앞뒤 공백', ' 005930 '],
    ['기호 포함', '005-30'],
  ])('%s은 400을 던진다', (_description, value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
