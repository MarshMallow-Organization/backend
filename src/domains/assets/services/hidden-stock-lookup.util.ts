import { PrismaService } from 'src/prisma/prisma.service';

/**
 * userId의 현재 유효한(만료 안 된) 숨김 종목 코드 집합을 조회한다.
 *
 * hiddenUntil이 지난 행은 정리 배치가 없어 DB에 그대로 남아있으므로,
 * 조회 시점에 hiddenUntil > now 조건으로 걸러야 한다.
 */
export async function getHiddenStockCodes(
  prisma: Pick<PrismaService, 'hiddenStock'>,
  userId: number,
): Promise<Set<string>> {
  const hiddenStocks = await prisma.hiddenStock.findMany({
    where: { userId, hiddenUntil: { gt: new Date() } },
    select: { stockCode: true },
  });

  return new Set(hiddenStocks.map((row) => row.stockCode));
}
