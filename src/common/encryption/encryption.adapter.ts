/**
 * 민감한 문자열(제3자 API secretKey 등)을 암/복호화하는 어댑터.
 *
 * AwsKmsEncryptionAdapter가 이 인터페이스의 유일한 구현체다. 인터페이스로
 * 분리해둔 덕에, 나중에 구현체를 바꿔도(예: KMS 리전 이전) 이걸
 * 주입받는 쪽(TossAccountService 등)은 손대지 않아도 된다.
 */
export interface EncryptionAdapter {
  encrypt(plainText: string): Promise<string>;
  decrypt(cipherText: string): Promise<string>;
}

/** EncryptionAdapter 구현체를 주입받을 때 쓰는 DI 토큰. */
export const ENCRYPTION_ADAPTER = Symbol('ENCRYPTION_ADAPTER');
