import {
  dateStringToDbDate,
  dbDateToDateString,
  decimalToNumber,
  summarizeTrades,
  sumRealizedProfit,
  weightedReturnRate,
} from './diary-record.mapper';

describe('diary record mapper', () => {
  it('Decimal 형태의 값을 number와 null로 변환한다', () => {
    expect(decimalToNumber({ toString: () => '12.34' })).toBe(12.34);
    expect(decimalToNumber(null)).toBeNull();
  });

  it('날짜 문자열을 UTC 자정 Date로 왕복 변환한다', () => {
    const date = dateStringToDbDate('2026-08-20');

    expect(date.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    expect(dbDateToDateString(date)).toBe('2026-08-20');
  });

  it('체결이 없으면 주문 가격과 수량을 사용한다', () => {
    expect(summarizeTrades({ price: 1000, quantity: 3 }, [])).toEqual({
      price: 1000,
      quantity: 3,
      totalAmount: 3000,
    });
  });

  it('분할 체결의 수량 가중평균과 총액을 계산한다', () => {
    expect(
      summarizeTrades({ price: null, quantity: 10 }, [
        { price: 1000, quantity: 2 },
        { price: 1300, quantity: 3 },
      ]),
    ).toEqual({ price: 1180, quantity: 5, totalAmount: 5900 });
  });

  it('SELL 손익 합계와 수량 가중 수익률을 계산한다', () => {
    const trades = [
      {
        price: 1000,
        quantity: 2,
        realizedProfit: 100,
        returnRate: 5,
      },
      {
        price: 1200,
        quantity: 3,
        realizedProfit: 240,
        returnRate: 10,
      },
    ];

    expect(sumRealizedProfit(trades)).toBe(340);
    expect(weightedReturnRate(trades)).toBe(8);
  });
});
