import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ENCRYPTION_ADAPTER } from 'src/common/encryption/encryption.adapter';
import type { EncryptionAdapter } from 'src/common/encryption/encryption.adapter';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from 'src/domains/api/clients/toss/toss.client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConnectTossAccountDto } from '../dto/request/connect-toss-account.dto';
import { TossAccountConnectedDto } from '../dto/response/toss-account-connected.dto';
import { TossAccountErrorCode } from '../error/toss-account.error';

@Injectable()
export class TossAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tossClient: TossClient,
    @Inject(ENCRYPTION_ADAPTER)
    private readonly encryptionAdapter: EncryptionAdapter,
  ) {}

  /**
   * 토스 apiKey/secretKey를 검증하고 연동(upsert)한다.
   *
   * 이미 연동돼 있어도 새 키로 덮어쓴다 — 재등록/키 교체를 별도
   * 충돌 에러 없이 허용한다.
   */
  async connectTossAccount(
    userId: number,
    dto: ConnectTossAccountDto,
  ): Promise<TossAccountConnectedDto> {
    await this.verifyCredentials(dto);

    const encryptedSecretKey = await this.encryptionAdapter.encrypt(
      dto.secretKey,
    );

    const account = await this.prisma.tossAccount.upsert({
      where: { userId },
      create: { userId, apiKey: dto.apiKey, secretKey: encryptedSecretKey },
      update: { apiKey: dto.apiKey, secretKey: encryptedSecretKey },
      select: { updatedAt: true },
    });

    return {
      id: userId,
      tossApi: {
        connected: true,
        connectedAt: account.updatedAt?.toISOString() ?? null,
      },
    };
  }

  /**
   * 입력받은 apiKey/secretKey로 실제 토스 OAuth 토큰 발급을 시도해서
   * 유효성을 검증한다.
   *
   * TossClient.getAccessToken()이 실패하면 throwTossException()이
   * BusinessException을 던지는데, 그 code는 고정된 카탈로그 값이 아니라
   * 토스 응답을 그대로 옮긴 동적 값(예: TOSS_HTTP_401, TOSS_INVALID_REQUEST)
   * 이라 code 문자열로는 판별할 수 없다(실서버로 잘못된 키를 넣어 직접
   * 확인함). 대신 실제 HTTP 상태(400/401 = "네가 보낸 키/요청이 틀렸다")로
   * 판별해서 TossAccountErrorCode.INVALID_CREDENTIALS로 좁혀 던진다.
   * 429/5xx 같은 토스 쪽 장애는 "키가 틀렸다"가 아니므로 그대로 전파한다.
   */
  private async verifyCredentials(dto: ConnectTossAccountDto): Promise<void> {
    try {
      await this.tossClient.getAccessToken({
        clientKey: dto.apiKey,
        clientSecret: dto.secretKey,
      });
    } catch (error) {
      if (
        error instanceof BusinessException &&
        (error.definition.status === HttpStatus.UNAUTHORIZED ||
          error.definition.status === HttpStatus.BAD_REQUEST)
      ) {
        throw new BusinessException(TossAccountErrorCode.INVALID_CREDENTIALS);
      }

      throw error;
    }
  }
}
