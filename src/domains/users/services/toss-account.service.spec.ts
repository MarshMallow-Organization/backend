import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from 'src/domains/api/clients/toss/toss.client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TossAccountService } from './toss-account.service';

/**
 * throwTossException()은 고정 카탈로그가 아니라, 토스 응답을 그대로
 * 옮긴 동적 code(예: TOSS_HTTP_401)로 BusinessException을 던진다.
 * 실서버 테스트로 확인한 실제 모양을 그대로 재현한다.
 */
const tossException = (status: number) =>
  new BusinessException({
    code: `TOSS_HTTP_${status}`,
    status,
    message: '증권사 API 처리 중 오류가 발생했습니다.',
  });

describe('TossAccountService', () => {
  let service: TossAccountService;
  let prisma: { tossAccount: { upsert: jest.Mock } };
  let tossClient: { getAccessToken: jest.Mock };
  let encryptionAdapter: { encrypt: jest.Mock; decrypt: jest.Mock };

  const userId = 1;
  const dto = { apiKey: 'api-key', secretKey: 'secret-key' };

  beforeEach(() => {
    prisma = {
      tossAccount: {
        upsert: jest
          .fn()
          .mockResolvedValue({ updatedAt: new Date('2026-07-26T09:00:00Z') }),
      },
    };
    tossClient = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    };
    encryptionAdapter = {
      encrypt: jest.fn().mockResolvedValue('encrypted-secret'),
      decrypt: jest.fn(),
    };

    service = new TossAccountService(
      prisma as unknown as PrismaService,
      tossClient as unknown as TossClient,
      encryptionAdapter,
    );
  });

  it('키 검증에 성공하면 secretKey를 암호화해서 upsert하고 연동 정보를 반환한다', async () => {
    const result = await service.connectTossAccount(userId, dto);

    expect(tossClient.getAccessToken).toHaveBeenCalledWith({
      clientKey: dto.apiKey,
      clientSecret: dto.secretKey,
    });
    expect(encryptionAdapter.encrypt).toHaveBeenCalledWith(dto.secretKey);
    expect(prisma.tossAccount.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: { userId, apiKey: dto.apiKey, secretKey: 'encrypted-secret' },
      update: { apiKey: dto.apiKey, secretKey: 'encrypted-secret' },
      select: { updatedAt: true },
    });
    expect(result).toEqual({
      id: userId,
      tossApi: {
        connected: true,
        connectedAt: '2026-07-26T09:00:00.000Z',
      },
    });
  });

  it('토스가 401을 던지면 INVALID_CREDENTIALS로 다시 던지고 upsert하지 않는다', async () => {
    tossClient.getAccessToken.mockRejectedValue(
      tossException(HttpStatus.UNAUTHORIZED),
    );

    await expect(service.connectTossAccount(userId, dto)).rejects.toMatchObject(
      {
        definition: expect.objectContaining({
          code: 'TOSS_ACCOUNT_INVALID_CREDENTIALS',
        }) as unknown,
      },
    );
    expect(prisma.tossAccount.upsert).not.toHaveBeenCalled();
  });

  it('토스가 400을 던져도 INVALID_CREDENTIALS로 다시 던진다', async () => {
    tossClient.getAccessToken.mockRejectedValue(
      tossException(HttpStatus.BAD_REQUEST),
    );

    await expect(service.connectTossAccount(userId, dto)).rejects.toMatchObject(
      {
        definition: expect.objectContaining({
          code: 'TOSS_ACCOUNT_INVALID_CREDENTIALS',
        }) as unknown,
      },
    );
    expect(prisma.tossAccount.upsert).not.toHaveBeenCalled();
  });

  it('토스 쪽 장애(429/5xx)는 키 문제가 아니므로 그대로 전파한다', async () => {
    const rateLimited = tossException(HttpStatus.TOO_MANY_REQUESTS);
    tossClient.getAccessToken.mockRejectedValue(rateLimited);

    await expect(service.connectTossAccount(userId, dto)).rejects.toBe(
      rateLimited,
    );
    expect(prisma.tossAccount.upsert).not.toHaveBeenCalled();
  });

  it('BusinessException이 아닌 예외는 그대로 전파한다', async () => {
    const unrelatedError = new Error('network down');
    tossClient.getAccessToken.mockRejectedValue(unrelatedError);

    await expect(service.connectTossAccount(userId, dto)).rejects.toBe(
      unrelatedError,
    );
    expect(prisma.tossAccount.upsert).not.toHaveBeenCalled();
  });

  it('이미 연동된 사용자가 다시 호출해도 upsert로 그대로 갱신된다', async () => {
    await service.connectTossAccount(userId, dto);
    await service.connectTossAccount(userId, {
      apiKey: 'new-api-key',
      secretKey: 'new-secret-key',
    });

    expect(prisma.tossAccount.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.tossAccount.upsert).toHaveBeenLastCalledWith({
      where: { userId },
      create: {
        userId,
        apiKey: 'new-api-key',
        secretKey: 'encrypted-secret',
      },
      update: { apiKey: 'new-api-key', secretKey: 'encrypted-secret' },
      select: { updatedAt: true },
    });
  });
});
