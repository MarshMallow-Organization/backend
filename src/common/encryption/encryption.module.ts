import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsKmsEncryptionAdapter } from './aws-kms-encryption.adapter';
import { ENCRYPTION_ADAPTER } from './encryption.adapter';
import type { EncryptionAdapter } from './encryption.adapter';
import { LocalEncryptionAdapter } from './local-encryption.adapter';

/**
 * ENCRYPTION_ADAPTER 토큰을 encryption.provider 설정에 따라
 * LocalEncryptionAdapter 또는 AwsKmsEncryptionAdapter에 바인딩한다.
 *
 * 두 구현체를 항상 같이 등록해두고 실제로 쓸 것 하나만 팩토리에서
 * 고른다 — 이 모듈을 import하는 쪽(UsersModule 등)은 provider가
 * 바뀌어도 손대지 않는다. 선택되지 않은 쪽은 생성만 되고 encrypt/decrypt를
 * 실제로 호출하기 전까지는 아무 env도 검증하지 않으므로(각 어댑터가
 * 클라이언트를 지연 생성한다), 로컬에서 AWS 자격증명이 없어도 앱이
 * 죽지 않는다.
 */
@Module({
  providers: [
    LocalEncryptionAdapter,
    AwsKmsEncryptionAdapter,
    {
      provide: ENCRYPTION_ADAPTER,
      useFactory: (
        configService: ConfigService,
        local: LocalEncryptionAdapter,
        kms: AwsKmsEncryptionAdapter,
      ): EncryptionAdapter =>
        configService.get<string>('encryption.provider') === 'kms'
          ? kms
          : local,
      inject: [ConfigService, LocalEncryptionAdapter, AwsKmsEncryptionAdapter],
    },
  ],
  exports: [ENCRYPTION_ADAPTER],
})
export class EncryptionModule {}
