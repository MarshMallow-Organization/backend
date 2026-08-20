type NumericValue = number | { toString(): string };

export type TradeSummarySource = {
  price: NumericValue;
  quantity: number;
  realizedProfit?: NumericValue | null;
  returnRate?: NumericValue | null;
};

export type OrderSummarySource = {
  price: NumericValue | null;
  quantity: number;
};

export type TradeSummary = {
  price: number | null;
  quantity: number;
  totalAmount: number | null;
};

export const decimalToNumber = (
  value: NumericValue | null | undefined,
): number | null => (value == null ? null : Number(value.toString()));

export const dateStringToDbDate = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

export const dbDateToDateString = (value: Date): string =>
  value.toISOString().slice(0, 10);

export const dateToIsoString = (value: Date): string => value.toISOString();

export const summarizeTrades = (
  order: OrderSummarySource,
  trades: readonly TradeSummarySource[],
): TradeSummary => {
  if (trades.length === 0) {
    const price = decimalToNumber(order.price);

    return {
      price,
      quantity: order.quantity,
      totalAmount: price === null ? null : price * order.quantity,
    };
  }

  const quantity = trades.reduce((sum, trade) => sum + trade.quantity, 0);
  const totalAmount = trades.reduce(
    (sum, trade) => sum + Number(trade.price.toString()) * trade.quantity,
    0,
  );

  return {
    price: quantity === 0 ? null : totalAmount / quantity,
    quantity,
    totalAmount: quantity === 0 ? null : totalAmount,
  };
};

export const sumRealizedProfit = (
  trades: readonly TradeSummarySource[],
): number | null => {
  const values = trades
    .map((trade) => decimalToNumber(trade.realizedProfit))
    .filter((value): value is number => value !== null);

  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0);
};

export const weightedReturnRate = (
  trades: readonly TradeSummarySource[],
): number | null => {
  const applicable = trades.flatMap((trade) => {
    const returnRate = decimalToNumber(trade.returnRate);
    return returnRate === null
      ? []
      : [{ returnRate, quantity: trade.quantity }];
  });
  const quantity = applicable.reduce((sum, trade) => sum + trade.quantity, 0);

  if (quantity === 0) {
    return null;
  }

  return (
    applicable.reduce(
      (sum, trade) => sum + trade.returnRate * trade.quantity,
      0,
    ) / quantity
  );
};
