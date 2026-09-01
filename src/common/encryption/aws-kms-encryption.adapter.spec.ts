import { ConfigService } from '@nestjs/config';
import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import { AwsKmsEncryptionAdapter } from './aws-kms-encryption.adapter';

jest.mock('@aws-sdk/client-kms');

describe('AwsKmsEncryptionAdapter', () => {
  const KEY_ARN = 'arn:aws:kms:ap-northeast-2:123456789012:key/test-key';

  let configValues: Record<string, string | undefined>;
  let configService: ConfigService;
  let sendMock: jest.Mock;

  const createAdapter = () => new AwsKmsEncryptionAdapter(configService);

  beforeEach(() => {
    jest.clearAllMocks();

    configValues = {
      'encryption.region': 'ap-northeast-2',
      'encryption.keyArn': KEY_ARN,
      'encryption.accessKeyId': 'AKIAEXAMPLE',
      'encryption.secretAccessKey': 'secret',
    };
    configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    sendMock = jest.fn();
    (KMSClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
    }));
  });

  it('encrypt는 EncryptCommand를 보내고 CiphertextBlob을 base64로 반환한다', async () => {
    sendMock.mockResolvedValue({
      CiphertextBlob: Buffer.from('cipher-bytes'),
    });

    const result = await createAdapter().encrypt('plain-text');

    expect(sendMock).toHaveBeenCalledWith(expect.any(EncryptCommand));
    expect(result).toBe(Buffer.from('cipher-bytes').toString('base64'));
  });

  it('decrypt는 DecryptCommand를 보내고 평문을 반환한다', async () => {
    sendMock.mockResolvedValue({ Plaintext: Buffer.from('plain-text') });
    const cipherText = Buffer.from('cipher-bytes').toString('base64');

    const result = await createAdapter().decrypt(cipherText);

    expect(sendMock).toHaveBeenCalledWith(expect.any(DecryptCommand));
    expect(result).toBe('plain-text');
  });

  it('AWS_REGION 또는 AWS_KMS_KEY_ARN이 없으면 에러를 던진다', async () => {
    configValues['encryption.region'] = undefined;

    await expect(createAdapter().encrypt('x')).rejects.toThrow();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('KMS 응답에 CiphertextBlob이 없으면 에러를 던진다', async () => {
    sendMock.mockResolvedValue({});

    await expect(createAdapter().encrypt('x')).rejects.toThrow();
  });

  it('KMS 응답에 Plaintext가 없으면 에러를 던진다', async () => {
    sendMock.mockResolvedValue({});

    await expect(createAdapter().decrypt('Y2lwaGVy')).rejects.toThrow();
  });

  it('액세스키/시크릿이 없으면 credentials 없이 클라이언트를 만든다(SDK 기본 자격증명 체인에 위임)', async () => {
    configValues['encryption.accessKeyId'] = undefined;
    configValues['encryption.secretAccessKey'] = undefined;
    sendMock.mockResolvedValue({ CiphertextBlob: Buffer.from('c') });

    await createAdapter().encrypt('x');

    const mockCalls = (KMSClient as unknown as jest.Mock).mock
      .calls as unknown[][];
    const clientOptions = mockCalls[0][0] as Record<string, unknown>;
    expect(clientOptions.credentials).toBeUndefined();
  });

  it('클라이언트를 한 번만 만들고 이후 호출은 재사용한다', async () => {
    sendMock.mockResolvedValue({ CiphertextBlob: Buffer.from('c') });
    const adapter = createAdapter();

    await adapter.encrypt('a');
    await adapter.encrypt('b');

    expect(KMSClient).toHaveBeenCalledTimes(1);
  });
});
