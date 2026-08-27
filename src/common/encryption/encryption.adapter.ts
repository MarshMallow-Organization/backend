/**
 * 민감한 문자열(제3자 API secretKey 등)을 암/복호화하는 어댑터.
 *
 * 지금은 AWS KMS 키(ARN)가 없어서 LocalEncryptionAdapter로 시작한다.
 * 나중에 AwsKmsEncryptionAdapter가 이 인터페이스를 구현해서
 * EncryptionModule의 provider 등록만 바꾸면, 이걸 주입받는 쪽
 * (TossAccountService 등)은 손대지 않아도 된다.
 */
export interface EncryptionAdapter {
  encrypt(plainText: string): Promise<string>;
  decrypt(cipherText: string): Promise<string>;
}

/** EncryptionAdapter 구현체를 주입받을 때 쓰는 DI 토큰. */
export const ENCRYPTION_ADAPTER = Symbol('ENCRYPTION_ADAPTER');
