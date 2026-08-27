import { Module } from '@nestjs/common';
import { ENCRYPTION_ADAPTER } from './encryption.adapter';
import { LocalEncryptionAdapter } from './local-encryption.adapter';

/**
 * ENCRYPTION_ADAPTER 토큰을 LocalEncryptionAdapter에 바인딩한다.
 *
 * 나중에 AWS KMS 키(ARN)가 준비되면, 여기 provider 등록만
 * AwsKmsEncryptionAdapter로 바꾸면 된다. 이 모듈을 import하는 쪽
 * (UsersModule 등)은 손대지 않아도 된다.
 */
@Module({
  providers: [
    LocalEncryptionAdapter,
    { provide: ENCRYPTION_ADAPTER, useClass: LocalEncryptionAdapter },
  ],
  exports: [ENCRYPTION_ADAPTER],
})
export class EncryptionModule {}
