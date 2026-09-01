import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exception/businessException';
import { GoogleOAuthClient } from './google-oauth.client';

describe('GoogleOAuthClient', () => {
  let configValues: Record<string, string | undefined>;
  let configService: ConfigService;
  let fetchMock: jest.Mock;

  const createClient = () => new GoogleOAuthClient(configService);

  const jsonResponse = (status: number, body: unknown): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    }) as unknown as Response;

  beforeEach(() => {
    configValues = {
      'google.clientId': 'client-id',
      'google.clientSecret': 'client-secret',
    };
    configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('code를 postmessage redirect_uri로 토큰 교환하고, 그 액세스 토큰으로 사용자 정보를 조회한다', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: 'google-access-token' }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          sub: 'google-sub-id',
          email: 'user@gmail.com',
          email_verified: true,
          name: '홍길동',
        }),
      );

    const result = await createClient().getUserInfo('auth-code');

    const [tokenUrl, tokenOptions] = fetchMock.mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
    const sentBody = new URLSearchParams(tokenOptions.body);
    expect(sentBody.get('code')).toBe('auth-code');
    expect(sentBody.get('redirect_uri')).toBe('postmessage');
    expect(sentBody.get('grant_type')).toBe('authorization_code');

    const [userInfoUrl, userInfoOptions] = fetchMock.mock.calls[1] as [
      string,
      { headers: { Authorization: string } },
    ];
    expect(userInfoUrl).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
    expect(userInfoOptions.headers.Authorization).toBe(
      'Bearer google-access-token',
    );

    expect(result).toEqual({
      sub: 'google-sub-id',
      email: 'user@gmail.com',
      email_verified: true,
      name: '홍길동',
    });
  });

  it('토큰 교환이 실패(4xx/5xx)하면 GOOGLE_AUTH_FAILED를 던진다', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: 'invalid_grant' }),
    );

    await expect(createClient().getUserInfo('bad-code')).rejects.toMatchObject({
      definition: expect.objectContaining({
        code: 'GOOGLE_AUTH_FAILED',
      }) as unknown,
    });
  });

  it('토큰 교환 요청 자체가 네트워크 에러면 GOOGLE_AUTH_FAILED를 던진다', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(
      createClient().getUserInfo('auth-code'),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('사용자 정보 조회가 실패하면 GOOGLE_AUTH_FAILED를 던진다', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: 'google-access-token' }),
      )
      .mockResolvedValueOnce(jsonResponse(401, { error: 'invalid_token' }));

    await expect(createClient().getUserInfo('auth-code')).rejects.toMatchObject(
      {
        definition: expect.objectContaining({
          code: 'GOOGLE_AUTH_FAILED',
        }) as unknown,
      },
    );
  });

  it('GOOGLE_CLIENT_ID/SECRET이 없으면 에러를 던진다', async () => {
    configValues['google.clientId'] = undefined;

    await expect(createClient().getUserInfo('auth-code')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
