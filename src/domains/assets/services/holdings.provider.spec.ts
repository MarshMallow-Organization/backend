import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exception/businessException';
import { HoldingsProvider } from './holdings.provider';

const createProvider = (stubEnabled: boolean) =>
  new HoldingsProvider({ get: () => stubEnabled } as unknown as ConfigService);

describe('HoldingsProvider', () => {
  it('HOLDINGS_STUB_ENABLED가 켜져 있으면 스텁 목록을 반환한다', async () => {
    const provider = createProvider(true);

    const holdings = await provider.getHoldings(1);

    expect(holdings.length).toBeGreaterThan(0);
  });

  it('HOLDINGS_STUB_ENABLED가 꺼져 있으면 BusinessException을 던진다', async () => {
    const provider = createProvider(false);

    await expect(provider.getHoldings(1)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });
});
