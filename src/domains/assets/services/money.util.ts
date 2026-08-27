/**
 * 수익률은 퍼센트, 소수 2자리다.
 *
 * 부동소수점 오차 때문에 곱했다 나누는 과정에서 8.199999999999999가
 * 나올 수 있어 반올림 전에 한 번 정리한다. Number.EPSILON을 더하는
 * 흔한 요령은 음수에서 반대로 작동해 쓰지 않는다.
 */
export const toPercent = (ratio: number): number =>
  Math.round(Number((ratio * 100).toFixed(6)) * 100) / 100;
