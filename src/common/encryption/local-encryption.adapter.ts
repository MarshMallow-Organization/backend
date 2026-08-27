import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { EncryptionAdapter } from './encryption.adapter';

const ALGORITHM = 'aes-256-gcm';
/** GCM 권장 IV 길이(바이트). */
const IV_LENGTH = 12;
/** aes-256이라 키는 정확히 32바이트(hex 64자리)여야 한다. */
const KEY_LENGTH = 32;

/**
 * AES-256-GCM으로 암/복호화하는 로컬 개발용 구현체.
 *
 * 실제 AWS KMS 키(ARN)가 아직 없어서 임시로 이 구현을 쓴다. Node 내장
 * crypto만 쓰므로 새 의존성이 필요 없다. 암호문 형식은
 * `base64(iv):base64(authTag):base64(ciphertext)`이고, 매번 새 IV를
 * 랜덤 생성하므로 같은 평문도 호출마다 다른 암호문이 나온다(재사용 시
 * GCM의 기밀성이 깨지는 걸 방지).
 */
@Injectable()
export class LocalEncryptionAdapter implements EncryptionAdapter {
  constructor(private readonly configService: ConfigService) {}

  private getKey(): Buffer {
    const hexKey = this.configService.get<string>('encryption.localKey');

    if (!hexKey) {
      throw new Error(
        'LOCAL_ENCRYPTION_KEY가 설정되지 않았습니다. `openssl rand -hex 32`로 생성해서 .env에 넣으세요.',
      );
    }

    const key = Buffer.from(hexKey, 'hex');

    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `LOCAL_ENCRYPTION_KEY는 ${KEY_LENGTH}바이트(hex 64자리)여야 합니다.`,
      );
    }

    return key;
  }

  /**
   * 인터페이스는 Promise<string>을 요구한다(나중에 AWS KMS로 바뀌면 진짜
   * 네트워크 호출이 필요해서). 이 로컬 구현은 동기 연산뿐이지만, async를
   * 빼면 getKey()의 throw가 진짜 reject가 아니라 호출 즉시 동기적으로
   * 터져버린다 — HoldingsProvider에서 겪었던 것과 같은 문제라 async를
   * 유지한다. await가 없다는 lint 경고는 의도된 것이라 무시한다.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async encrypt(plainText: string): Promise<string> {
    const key = this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async decrypt(cipherText: string): Promise<string> {
    const key = this.getKey();
    const [ivPart, authTagPart, dataPart] = cipherText.split(':');

    if (!ivPart || !authTagPart || !dataPart) {
      throw new Error('암호문 형식이 올바르지 않습니다.');
    }

    const iv = Buffer.from(ivPart, 'base64');
    const authTag = Buffer.from(authTagPart, 'base64');
    const data = Buffer.from(dataPart, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

    return decrypted.toString('utf8');
  }
}
