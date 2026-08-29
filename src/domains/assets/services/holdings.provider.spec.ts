import { ConfigService } from '@nestjs/config';
import { TossClient } from 'src/domains/api/clients/toss/toss.client';
import { PrismaService } from 'src/prisma/prisma.service';
import { HoldingsProvider } from './holdings.provider';

describe('HoldingsProvider', () => {
  let configService: { get: jest.Mock };
  let prisma: { tossAccount: { findUnique: jest.Mock } };
  let tossClient: { request: jest.Mock };
  let encryptionAdapter: { encrypt: jest.Mock; decrypt: jest.Mock };

  const userId = 1;
  const storedAccount = { apiKey: 'api-key', secretKey: 'encrypted-secret' };

  const createProvider = (stubEnabled: boolean) => {
    configService = {
      get: jest.fn((key: string) =>
        key === 'holdings.stubEnabled' ? stubEnabled : undefined,
      ),
    };
    prisma = {
      tossAccount: {
        findUnique: jest.fn().mockResolvedValue(storedAccount),
      },
    };
    tossClient = { request: jest.fn() };
    encryptionAdapter = {
      encrypt: jest.fn(),
      decrypt: jest.fn().mockResolvedValue('decrypted-secret'),
    };

    return new HoldingsProvider(
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
      tossClient as unknown as TossClient,
      encryptionAdapter,
    );
  };

  const accountsResponse = (accountSeq = 1) => ({
    result: [
      { accountNo: '12345678901', accountSeq, accountType: 'BROKERAGE' },
    ],
  });

  const krwItem = {
    symbol: '005930',
    name: '삼성전자',
    marketCountry: 'KR' as const,
    currency: 'KRW' as const,
    quantity: '100',
    lastPrice: '72000',
    averagePurchasePrice: '65000',
    marketValue: {
      purchaseAmount: '6500000',
      amount: '7200000',
      amountAfterCost: '7050000',
    },
    profitLoss: {
      amount: '700000',
      amountAfterCost: '550000',
      rate: '0.1077',
      rateAfterCost: '0.0846',
    },
    dailyProfitLoss: { amount: '100000', rate: '0.0141' },
  };

  const usdItem = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    marketCountry: 'US' as const,
    currency: 'USD' as const,
    quantity: '10',
    lastPrice: '178.5',
    averagePurchasePrice: '155.3',
    marketValue: {
      purchaseAmount: '1553',
      amount: '1785',
      amountAfterCost: '1771.43',
    },
    profitLoss: {
      amount: '232',
      amountAfterCost: '218.43',
      rate: '0.1494',
      rateAfterCost: '0.1406',
    },
    dailyProfitLoss: { amount: '25', rate: '0.0142' },
  };

  describe('HOLDINGS_STUB_ENABLED이 켜져 있으면', () => {
    it('토스를 호출하지 않고 스텁 목록을 반환한다', async () => {
      const provider = createProvider(true);

      const holdings = await provider.getHoldings(userId);

      expect(holdings.length).toBeGreaterThan(0);
      expect(tossClient.request).not.toHaveBeenCalled();
    });
  });

  describe('HOLDINGS_STUB_ENABLED이 꺼져 있으면', () => {
    it('TossAccount가 없으면 계좌 미연동 에러를 던진다', async () => {
      const provider = createProvider(false);
      prisma.tossAccount.findUnique.mockResolvedValue(null);

      await expect(provider.getHoldings(userId)).rejects.toMatchObject({
        definition: expect.objectContaining({
          code: 'TOSS_ACCOUNT_NOT_CONNECTED',
        }) as unknown,
      });
      expect(tossClient.request).not.toHaveBeenCalled();
    });

    it('저장된 secretKey를 복호화해 토스 자격 증명으로 넘긴다', async () => {
      const provider = createProvider(false);
      tossClient.request
        .mockResolvedValueOnce(accountsResponse())
        .mockResolvedValueOnce({ result: { items: [krwItem] } });

      await provider.getHoldings(userId);

      expect(encryptionAdapter.decrypt).toHaveBeenCalledWith(
        storedAccount.secretKey,
      );
      expect(tossClient.request).toHaveBeenCalledWith(
        '/accounts',
        expect.objectContaining({
          tossCredentials: {
            clientKey: storedAccount.apiKey,
            clientSecret: 'decrypted-secret',
          },
        }),
      );
    });

    it('계좌 목록이 비어 있으면 NO_BROKERAGE_ACCOUNT 에러를 던진다', async () => {
      const provider = createProvider(false);
      tossClient.request.mockResolvedValueOnce({ result: [] });

      await expect(provider.getHoldings(userId)).rejects.toMatchObject({
        definition: expect.objectContaining({
          code: 'HOLDINGS_NO_BROKERAGE_ACCOUNT',
        }) as unknown,
      });
    });

    it('계좌 목록의 accountSeq를 holdings 호출 헤더에 담아 보낸다', async () => {
      const provider = createProvider(false);
      tossClient.request
        .mockResolvedValueOnce(accountsResponse(42))
        .mockResolvedValueOnce({ result: { items: [] } });

      await provider.getHoldings(userId);

      expect(tossClient.request).toHaveBeenLastCalledWith(
        '/holdings',
        expect.objectContaining({
          headers: { 'X-Tossinvest-Account': '42' },
        }),
      );
    });

    it('국내(KRW) 종목만 있으면 환율을 조회하지 않고 그대로 매핑한다', async () => {
      const provider = createProvider(false);
      tossClient.request
        .mockResolvedValueOnce(accountsResponse())
        .mockResolvedValueOnce({ result: { items: [krwItem] } });

      const holdings = await provider.getHoldings(userId);

      expect(tossClient.request).toHaveBeenCalledTimes(2); // 환율 호출 없음
      expect(holdings).toEqual([
        {
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 100,
          avgBuyPrice: 65000,
          currentPrice: 72000,
          totalPurchaseAmount: 6500000,
          evaluationAmount: 7200000,
          profitAmount: 700000,
          dailyProfitAmount: 100000,
        },
      ]);
    });

    it('미국(USD) 종목이 있으면 환율을 조회해 원화로 환산한다', async () => {
      const provider = createProvider(false);
      tossClient.request
        .mockResolvedValueOnce(accountsResponse())
        .mockResolvedValueOnce({ result: { items: [usdItem] } })
        .mockResolvedValueOnce({
          result: { baseCurrency: 'USD', quoteCurrency: 'KRW', rate: '1380' },
        });

      const holdings = await provider.getHoldings(userId);

      expect(tossClient.request).toHaveBeenNthCalledWith(
        3,
        '/exchange-rate?baseCurrency=USD&quoteCurrency=KRW',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(holdings[0]).toMatchObject({
        stockCode: 'AAPL',
        stockName: 'Apple Inc.',
        quantity: 10,
        totalPurchaseAmount: Math.round(1553 * 1380), // 2143140
        evaluationAmount: Math.round(1785 * 1380), // 2463300
      });
    });

    it('국내·해외 종목이 섞여 있으면 국내 종목은 그대로, 해외 종목만 환산한다', async () => {
      const provider = createProvider(false);
      tossClient.request
        .mockResolvedValueOnce(accountsResponse())
        .mockResolvedValueOnce({ result: { items: [krwItem, usdItem] } })
        .mockResolvedValueOnce({
          result: { baseCurrency: 'USD', quoteCurrency: 'KRW', rate: '1380' },
        });

      const holdings = await provider.getHoldings(userId);

      expect(holdings[0].evaluationAmount).toBe(7200000); // 원화, 그대로
      expect(holdings[1].evaluationAmount).toBe(Math.round(1785 * 1380)); // 달러, 환산
    });
  });
});
