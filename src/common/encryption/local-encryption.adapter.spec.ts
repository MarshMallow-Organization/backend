import { ConfigService } from '@nestjs/config';
import { LocalEncryptionAdapter } from './local-encryption.adapter';

const VALID_KEY = 'a'.repeat(64); // 32바이트 hex

const createAdapter = (localKey: string | undefined) =>
  new LocalEncryptionAdapter({
    get: () => localKey,
  } as unknown as ConfigService);

describe('LocalEncryptionAdapter', () => {
  it('encrypt한 값을 decrypt하면 원본과 같다', async () => {
    const adapter = createAdapter(VALID_KEY);
    const plainText = 'toss-secret-key-value';

    const encrypted = await adapter.encrypt(plainText);
    const decrypted = await adapter.decrypt(encrypted);

    expect(decrypted).toBe(plainText);
  });

  it('같은 평문을 여러 번 암호화해도 매번 다른 암호문이 나온다(IV 랜덤성)', async () => {
    const adapter = createAdapter(VALID_KEY);
    const plainText = 'same-plain-text';

    const first = await adapter.encrypt(plainText);
    const second = await adapter.encrypt(plainText);

    expect(first).not.toBe(second);
  });

  it('LOCAL_ENCRYPTION_KEY가 없으면 에러를 던진다', async () => {
    const adapter = createAdapter(undefined);

    await expect(adapter.encrypt('x')).rejects.toThrow();
  });

  it('LOCAL_ENCRYPTION_KEY 길이가 32바이트가 아니면 에러를 던진다', async () => {
    const adapter = createAdapter('deadbeef'); // 4바이트뿐

    await expect(adapter.encrypt('x')).rejects.toThrow();
  });

  it('변조된 암호문은 decrypt 시 에러를 던진다(GCM 무결성 검증)', async () => {
    const adapter = createAdapter(VALID_KEY);
    const encrypted = await adapter.encrypt('plain');
    const [iv, authTag, data] = encrypted.split(':');

    /**
     * base64 문자열 끝에 문자를 덧붙이면 디코딩 시 조용히 무시될 수 있어
     * 실제로는 안 변조된 것과 같아진다. 바이트 하나를 뒤집어야
     * GCM 인증 태그 검증이 확실히 실패한다.
     */
    const dataBuffer = Buffer.from(data, 'base64');
    dataBuffer[0] = dataBuffer[0] ^ 0xff;
    const tampered = [iv, authTag, dataBuffer.toString('base64')].join(':');

    await expect(adapter.decrypt(tampered)).rejects.toThrow();
  });
});
