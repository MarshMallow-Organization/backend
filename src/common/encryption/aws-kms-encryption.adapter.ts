import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import { EncryptionAdapter } from './encryption.adapter';

/**
 * AWS KMS로 암/복호화하는 실서비스용 구현체.
 *
 * KMS의 Encrypt/Decrypt API를 그대로 쓴다 — 이 API는 평문이 4KB 이하일
 * 때만 되는데, secretKey 같은 짧은 문자열엔 충분하다(더 큰 데이터를
 * 암호화해야 하면 GenerateDataKey로 봉투 암호화를 써야 한다). 암호문은
 * KMS가 돌려주는 CiphertextBlob을 base64로 인코딩해 그대로 저장한다.
 *
 * 클라이언트를 생성자가 아니라 실제 호출 시점에 만든다. AWS 관련 env가
 * 아직 없는 상태(예: 로컬 셋업 전)에서도 앱 부팅 자체는 죽지 않게
 * 하기 위해서다 — encrypt/decrypt를 실제로 호출할 때만 검증한다.
 */
@Injectable()
export class AwsKmsEncryptionAdapter implements EncryptionAdapter {
  private client: KMSClient | null = null;
  private keyArn: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): { client: KMSClient; keyArn: string } {
    if (this.client && this.keyArn) {
      return { client: this.client, keyArn: this.keyArn };
    }

    const region = this.configService.get<string>('encryption.region');
    const keyArn = this.configService.get<string>('encryption.keyArn');
    const accessKeyId = this.configService.get<string>(
      'encryption.accessKeyId',
    );
    const secretAccessKey = this.configService.get<string>(
      'encryption.secretAccessKey',
    );

    if (!region || !keyArn) {
      throw new Error(
        'AWS_REGION과 AWS_KMS_KEY_ARN이 설정되지 않았습니다. .env를 확인하세요.',
      );
    }

    this.keyArn = keyArn;
    this.client = new KMSClient({
      region,
      /**
       * 로컬 개발은 IAM 사용자 액세스키/시크릿을 쓰지만, 배포 환경에서
       * IAM 롤을 쓰면 이 값들이 없다 — 그때는 SDK 기본 자격증명 체인
       * (인스턴스 프로파일 등)에 맡긴다.
       */
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });

    return { client: this.client, keyArn: this.keyArn };
  }

  async encrypt(plainText: string): Promise<string> {
    const { client, keyArn } = this.getClient();

    const response = await client.send(
      new EncryptCommand({
        KeyId: keyArn,
        Plaintext: Buffer.from(plainText, 'utf8'),
      }),
    );

    if (!response.CiphertextBlob) {
      throw new Error('KMS Encrypt 응답에 CiphertextBlob이 없습니다.');
    }

    return Buffer.from(response.CiphertextBlob).toString('base64');
  }

  async decrypt(cipherText: string): Promise<string> {
    const { client, keyArn } = this.getClient();

    /**
     * KeyId를 명시하지 않아도 KMS가 암호문 메타데이터로 키를 알아서
     * 찾지만, 다른 키로 암호화된 값이 실수로 섞여 들어와도 조용히
     * 복호화되는 걸 막기 위해 우리가 쓰는 키로 명시적으로 제한한다.
     */
    const response = await client.send(
      new DecryptCommand({
        KeyId: keyArn,
        CiphertextBlob: Buffer.from(cipherText, 'base64'),
      }),
    );

    if (!response.Plaintext) {
      throw new Error('KMS Decrypt 응답에 Plaintext가 없습니다.');
    }

    return Buffer.from(response.Plaintext).toString('utf8');
  }
}
