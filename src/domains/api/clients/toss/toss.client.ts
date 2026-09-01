import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TossCredentials, TossTokenResponse } from './toss.types';
import { throwTossException, TossErrorCode } from './toss.error';
import { BusinessException } from 'src/common/exception/businessException';

@Injectable()
export class TossClient {
  private readonly logger = new Logger(TossClient.name);
  // 토스 증권 openAPI 기본 호스트 관리
  private readonly baseUrl = 'https://openapi.tossinvest.com';

  // clientKey 별 메모리 캐싱용 토큰 맵 (키: clientKey 또는 '__DEV_DEFAULT__')
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();
  // 401로 무효화된 만료 토큰 집합 (재사용 방지)
  private invalidatedManualTokens = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 개발자 모드(TOSS_DEVELOPER_MODE) 활성화 여부 확인
   */
  private isDeveloperMode(): boolean {
    return this.configService.get<boolean>('toss.developerMode') ?? false;
  }

  /**
   * 유효한 Access Token을 조회하거나 필요 시 새로 발급받아 반환합니다.
   * - 운영 모드(!isDeveloperMode): 사용자 연동 키(credentials)가 필수이며 .env 개발자 키를 절대 읽지 않음
   * - 개발자 모드(isDeveloperMode): 사용자 연동 키가 없으면 .env의 개발자 테스트 키를 fallback으로 사용
   *
   * @param credentials 사용자별 키 (운영 환경 필수)
   * @param forceRefresh true일 경우 캐시를 무시하고 무조건 새로 발급
   */
  async getAccessToken(
    credentials?: TossCredentials,
    forceRefresh = false,
  ): Promise<string> {
    const isDevMode = this.isDeveloperMode();

    // 1. 직접 전달된 accessToken이 있는 경우 (강제 갱신이 아닐 때)
    if (credentials?.accessToken && !forceRefresh) {
      return credentials.accessToken;
    }

    const cacheKey =
      credentials?.clientKey ?? (isDevMode ? '__DEV_DEFAULT__' : null);

    // 2. 개발자 모드일 때만 .env에 수동 설정된 기본 토큰 확인 (무효화된 토큰 제외)
    if (isDevMode && !credentials && !forceRefresh) {
      const manualDefaultToken =
        this.configService.get<string>('toss.accessToken');
      if (
        manualDefaultToken &&
        !this.invalidatedManualTokens.has(manualDefaultToken)
      ) {
        return manualDefaultToken;
      }
    }

    // 3. 캐시된 유효 토큰 확인 (만료 60초 전까지 유효한 것으로 간주)
    if (cacheKey) {
      const cached = this.tokenCache.get(cacheKey);
      const now = Date.now();
      if (!forceRefresh && cached && now + 60_000 < cached.expiresAt) {
        return cached.token;
      }
    }

    // 4. 사용할 clientKey & clientSecret 결정
    // - 운영 모드: 사용자 연동 키가 없으면 계좌 미연동 예외 발생
    // - 개발자 모드: 사용자 연동 키가 없으면 .env의 개발자 테스트 키 사용
    if (!isDevMode && !credentials) {
      throw new BusinessException(TossErrorCode.ACCOUNT_NOT_CONNECTED);
    }

    const clientKey =
      credentials?.clientKey ??
      (isDevMode
        ? this.configService.get<string>('toss.clientKey')
        : undefined);
    const clientSecret =
      credentials?.clientSecret ??
      (isDevMode
        ? this.configService.get<string>('toss.clientSecret')
        : undefined);

    if (!clientKey || !clientSecret) {
      throw new Error(
        isDevMode
          ? '[TossClient] TOSS_CLIENT_KEY 또는 TOSS_CLIENT_SECRET이 설정되지 않았습니다.'
          : '[TossClient] 토스 증권 연동 키 정보(clientKey, clientSecret)가 누락되었습니다.',
      );
    }

    // 5. 신규 토큰 발급 및 캐싱
    const issued = await this.issueAccessToken(clientKey, clientSecret);
    if (cacheKey) {
      this.tokenCache.set(cacheKey, issued);
    }
    return issued.token;
  }

  /**
   * 토스 오픈API OAuth 엔드포인트를 호출하여 새 Access Token을 발급받습니다.
   * POST https://openapi.tossinvest.com/oauth2/token
   * Content-Type: application/x-www-form-urlencoded
   */
  private async issueAccessToken(
    clientKey: string,
    clientSecret: string,
  ): Promise<{ token: string; expiresAt: number }> {
    this.logger.log(
      `[TossClient] 새로운 Access Token 발급 요청 중 (clientKey: ${clientKey.slice(0, 6)}...)`,
    );

    try {
      const bodyParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientKey,
        client_secret: clientSecret,
      });

      const response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `[TossClient] 토큰 발급 실패 (${response.status}): ${errorBody}`,
        );
        throwTossException(response.status, errorBody, response.headers, {
          endpoint: '/oauth2/token',
        });
      }

      const data = (await response.json()) as TossTokenResponse;
      const expiresInSec = data.expires_in ?? 86400;
      const expiresAt = Date.now() + expiresInSec * 1000;

      this.logger.log(
        `[TossClient] Access Token 발급 성공 (유효기간: ${expiresInSec}초)`,
      );
      return { token: data.access_token, expiresAt };
    } catch (error) {
      this.logger.error('[TossClient] 토큰 발급 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 토스 증권 공통 HTTP 요청 메서드
   * 사용자별 키(tossCredentials)가 주어지면 해당 사용자 토큰으로, 없으면 개발자 기본 키로 요청합니다.
   * 만약 401(토큰 만료)이 발생하면 해당 키의 토큰을 1회 자동 재발급 후 재시도합니다.
   *
   * @param endpoint API 엔드포인트 경로 (예: '/stocks?symbols=005930', '/orders')
   * @param options fetch 옵션 + tossCredentials
   * @param isRetry 401 재시도 여부 플래그
   */
  async request<T>(
    endpoint: string,
    options: RequestInit & { tossCredentials?: TossCredentials } = {},
    isRetry = false,
  ): Promise<T> {
    const { tossCredentials, ...fetchOptions } = options;
    const accessToken = await this.getAccessToken(tossCredentials);
    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const apiPath = cleanPath.startsWith('/api/v1')
      ? cleanPath
      : `/api/v1${cleanPath}`;
    const url = `${this.baseUrl}${apiPath}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...fetchOptions.headers,
        },
        signal: fetchOptions.signal ?? AbortSignal.timeout(5000),
      });

      // 401 Unauthorized 발생 시 해당 키의 토큰 강제 갱신 후 1회 재시도
      if (response.status === 401 && !isRetry) {
        this.logger.warn(
          `[TossClient] 401 Unauthorized 감지. 토큰 갱신 후 1회 재시도합니다. (url: ${url})`,
        );
        const cacheKey = tossCredentials?.clientKey ?? '__DEFAULT__';
        this.tokenCache.delete(cacheKey);
        this.invalidatedManualTokens.add(accessToken);
        await this.getAccessToken(tossCredentials, true);
        return this.request<T>(endpoint, options, true);
      }

      // 에러 응답 처리
      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `[TossClient] API 호출 실패 (${response.status}): ${errorBody}`,
        );
        throwTossException(response.status, errorBody, response.headers, {
          endpoint: apiPath,
        });
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.error(`[TossClient] 요청 타임아웃 (url: ${url})`);
        throwTossException(HttpStatus.SERVICE_UNAVAILABLE, 'Request Timeout', {
          endpoint: apiPath,
        });
      }
      throw error;
    }
  }
}
