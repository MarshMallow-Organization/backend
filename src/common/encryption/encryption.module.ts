import { Module } from '@nestjs/common';
import { AwsKmsEncryptionAdapter } from './aws-kms-encryption.adapter';
import { ENCRYPTION_ADAPTER } from './encryption.adapter';

/**
 * ENCRYPTION_ADAPTER 토큰을 AwsKmsEncryptionAdapter에 바인딩한다.
 *
 * 로컬 대칭키 방식(LocalEncryptionAdapter)은 걷어냈다 — provider 전환
 * 시 두 방식의 암호문 포맷이 서로 호환되지 않아(로컬은
 * `base64(iv):base64(authTag):base64(ciphertext)`, KMS는 `CiphertextBlob`
 * 하나) 나중에 로컬로 저장된 실데이터가 생기면 KMS 전환 때 복호화가
 * 깨지는 위험이 있었다. 처음부터 KMS 하나로만 가서 이 위험을 없앤다.
 */
@Module({
  providers: [
    AwsKmsEncryptionAdapter,
    { provide: ENCRYPTION_ADAPTER, useClass: AwsKmsEncryptionAdapter },
  ],
  exports: [ENCRYPTION_ADAPTER],
})
export class EncryptionModule {}
