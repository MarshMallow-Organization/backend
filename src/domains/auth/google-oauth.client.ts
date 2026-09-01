import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exception/businessException';
import { AuthErrorCode } from './auth-error-code';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * 프론트가 팝업/JS SDK(Google Identity Services code client)로 code를
 * 받는 방식 전용 고정값. 실제 페이지 리다이렉트가 없으므로 우리 서버에
 * /callback 라우트가 필요 없고, 토큰 교환 시 이 값을 그대로 넘긴다.
 */
const POPUP_REDIRECT_URI = 'postmessage';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

/**
 * 구글 authorization code를 서버가 직접 토큰으로 교환하고, 그 액세스
 * 토큰으로 사용자 정보를 조회한다.
 *
 * id_token(JWT)을 우리가 직접 디코드/서명 검증하는 대신, 액세스 토큰으로
 * userinfo 엔드포인트를 호출해서 구글이 다시 한번 신원을 확인해주는
 * 응답을 받는다 — 어차피 이 액세스 토큰 자체가 우리 서버·구글 사이의
 * 직접 HTTPS 통신(client_secret 인증됨)으로만 얻어지므로, JWT 서명
 * 검증 라이브러리를 새로 추가하지 않아도 신뢰할 수 있다.
 */
@Injectable()
export class GoogleOAuthClient {
  private readonly logger = new Logger(GoogleOAuthClient.name);

  constructor(private readonly configService: ConfigService) {}

  async getUserInfo(code: string): Promise<GoogleUserInfo> {
    const accessToken = await this.exchangeCodeForAccessToken(code);
    return this.fetchUserInfo(accessToken);
  }

  private async exchangeCodeForAccessToken(code: string): Promise<string> {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');

    if (!clientId || !clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET이 설정되지 않았습니다.',
      );
    }

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: POPUP_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    let response: Response;
    try {
      response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      this.logger.warn(
        `[GoogleOAuthClient] 토큰 교환 요청 실패: ${String(error)}`,
      );
      throw new BusinessException(AuthErrorCode.GOOGLE_AUTH_FAILED);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.warn(
        `[GoogleOAuthClient] 토큰 교환 실패 (${response.status}): ${errorBody}`,
      );
      throw new BusinessException(AuthErrorCode.GOOGLE_AUTH_FAILED);
    }

    const data = (await response.json()) as GoogleTokenResponse;
    return data.access_token;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    let response: Response;
    try {
      response = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      this.logger.warn(
        `[GoogleOAuthClient] 사용자 정보 조회 요청 실패: ${String(error)}`,
      );
      throw new BusinessException(AuthErrorCode.GOOGLE_AUTH_FAILED);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.warn(
        `[GoogleOAuthClient] 사용자 정보 조회 실패 (${response.status}): ${errorBody}`,
      );
      throw new BusinessException(AuthErrorCode.GOOGLE_AUTH_FAILED);
    }

    return (await response.json()) as GoogleUserInfo;
  }
}
