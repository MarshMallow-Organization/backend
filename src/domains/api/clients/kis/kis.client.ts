import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KisTokenResponse,
  KisApprovalKeyResponse,
  KisApiRequestOptions,
} from './kis.types';
import { throwKisException } from './kis.error';

@Injectable()
export class KisClient {
  private readonly logger = new Logger(KisClient.name);

  // 한국투자증권 OpenAPI 기본 호스트 (실전투자 기준)
  private readonly baseUrl = 'https://openapi.koreainvestment.com:9443';
  // 한국투자증권 실시간 웹소켓 기본 호스트
  private readonly wsUrl = 'ws://ops.koreainvestment.com:21000';

  // REST Access Token 메모리 캐시
  private tokenCache: { token: string; expiresAt: number } | null = null;
  // 웹소켓 접속키(Approval Key) 메모리 캐시
  private approvalKeyCache: { key: string; expiresAt: number } | null = null;
  // 401 등으로 무효화된 수동 토큰 집합
  private invalidatedManualTokens = new Set<string>();
  // 무효화된 수동 Approval Key 집합
  private invalidatedManualApprovalKeys = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 한국투자증권 실시간 웹소켓 기본 접속 URL을 반환합니다.
   */
  getWebSocketUrl(): string {
    return this.wsUrl;
  }

  /**
   * 유효한 REST Access Token을 반환하거나 필요 시 새로 발급받아 반환합니다.
   *
   * @param forceRefresh true일 경우 캐시를 무시하고 무조건 새로 발급
   */
  async getAccessToken(forceRefresh = false): Promise<string> {
    // 1. .env에 직접 설정된 수동 토큰 확인 (무효화된 토큰 제외)
    if (!forceRefresh) {
      const manualToken = this.configService.get<string>('kis.accessToken');
      if (manualToken && !this.invalidatedManualTokens.has(manualToken)) {
        return manualToken;
      }
    }

    // 2. 캐시된 유효 토큰 확인 (만료 60초 전까지 유효)
    const now = Date.now();
    if (
      !forceRefresh &&
      this.tokenCache &&
      now + 60_000 < this.tokenCache.expiresAt
    ) {
      return this.tokenCache.token;
    }

    // 3. .env 환경변수에서 KIS_APP_KEY, KIS_APP_SECRET 조회
    const appKey = this.configService.get<string>('kis.appKey');
    const appSecret = this.configService.get<string>('kis.appSecret');

    if (!appKey || !appSecret) {
      throw new Error(
        '[KisClient] KIS_APP_KEY 또는 KIS_APP_SECRET이 .env에 설정되지 않았습니다.',
      );
    }

    // 4. 신규 토큰 발급 및 캐싱
    const issued = await this.issueAccessToken(appKey, appSecret);
    this.tokenCache = issued;
    return issued.token;
  }

  /**
   * KIS OAuth2 토큰 발급 엔드포인트를 호출하여 새 Access Token을 발급받습니다.
   * POST /oauth2/tokenP
   */
  private async issueAccessToken(
    appKey: string,
    appSecret: string,
  ): Promise<{ token: string; expiresAt: number }> {
    this.logger.log(
      `[KisClient] 새로운 Access Token 발급 요청 중 (appKey: ${appKey.slice(0, 6)}...)`,
    );

    try {
      const response = await fetch(`${this.baseUrl}/oauth2/tokenP`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: appKey,
          appsecret: appSecret,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `[KisClient] 토큰 발급 실패 (${response.status}): ${errorBody}`,
        );
        throwKisException(response.status, errorBody, response.headers, {
          endpoint: '/oauth2/tokenP',
        });
      }

      const data = (await response.json()) as KisTokenResponse;
      const expiresInSec = data.expires_in ?? 86400;
      const expiresAt = Date.now() + expiresInSec * 1000;

      this.logger.log(
        `[KisClient] Access Token 발급 성공 (유효기간: ${expiresInSec}초)`,
      );
      return { token: data.access_token, expiresAt };
    } catch (error) {
      this.logger.error('[KisClient] 토큰 발급 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 실시간 웹소켓 접속용 Approval Key를 반환하거나 필요 시 발급받아 반환합니다.
   * POST /oauth2/Approval
   *
   * @param forceRefresh true일 경우 캐시를 무시하고 새로 발급
   */
  async getApprovalKey(forceRefresh = false): Promise<string> {
    // 1. .env에 직접 설정된 수동 approvalKey 확인 (무효화된 키 제외)
    if (!forceRefresh) {
      const manualKey = this.configService.get<string>('kis.approvalKey');
      if (manualKey && !this.invalidatedManualApprovalKeys.has(manualKey)) {
        return manualKey;
      }
    }

    // 2. 캐시된 유효 키 확인 (만료 60초 전까지 유효)
    const now = Date.now();
    if (
      !forceRefresh &&
      this.approvalKeyCache &&
      now + 60_000 < this.approvalKeyCache.expiresAt
    ) {
      return this.approvalKeyCache.key;
    }

    const appKey = this.configService.get<string>('kis.appKey');
    const appSecret = this.configService.get<string>('kis.appSecret');

    if (!appKey || !appSecret) {
      throw new Error(
        '[KisClient] KIS_APP_KEY 또는 KIS_APP_SECRET이 .env에 설정되지 않았습니다.',
      );
    }

    this.logger.log('[KisClient] 실시간 웹소켓 Approval Key 발급 요청 중');

    try {
      const response = await fetch(`${this.baseUrl}/oauth2/Approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: appKey,
          secretkey: appSecret,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `[KisClient] Approval Key 발급 실패 (${response.status}): ${errorBody}`,
        );
        throwKisException(response.status, errorBody, response.headers, {
          endpoint: '/oauth2/Approval',
        });
      }

      const data = (await response.json()) as KisApprovalKeyResponse;
      // 웹소켓 Approval Key는 1일(86400초) 유효
      const expiresAt = Date.now() + 86400 * 1000;
      this.approvalKeyCache = { key: data.approval_key, expiresAt };

      this.logger.log('[KisClient] Approval Key 발급 성공');
      return data.approval_key;
    } catch (error) {
      this.logger.error('[KisClient] Approval Key 발급 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * KIS 공통 HTTP REST 요청 메서드
   *
   * @param endpoint API 엔드포인트 경로 (예: '/uapi/domestic-stock/v1/quotations/inquire-price')
   * @param options 요청 옵션 (trId, trCont, custtype, fetch 옵션 등)
   * @param isRetry 401 재시도 여부 플래그
   */
  async request<T>(
    endpoint: string,
    options: KisApiRequestOptions = {},
    isRetry = false,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const appKey = this.configService.get<string>('kis.appKey') ?? '';
    const appSecret = this.configService.get<string>('kis.appSecret') ?? '';

    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      authorization: `Bearer ${accessToken}`,
      appkey: appKey,
      appsecret: appSecret,
      custtype: options.custtype ?? 'P',
      tr_cont: options.trCont ?? '',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (options.trId) {
      headers['tr_id'] = options.trId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal ?? AbortSignal.timeout(5000),
      });

      // 401 Unauthorized 감지 시 토큰 갱신 후 1회 재시도
      if (response.status === 401 && !isRetry) {
        this.logger.warn(
          `[KisClient] 401 Unauthorized 감지. 토큰 갱신 후 재시도합니다. (url: ${url})`,
        );
        this.tokenCache = null;
        this.invalidatedManualTokens.add(accessToken);
        await this.getAccessToken(true);
        return this.request<T>(endpoint, options, true);
      }

      // HTTP 에러 응답 처리
      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `[KisClient] API 호출 실패 (${response.status}): ${errorBody}`,
        );
        throwKisException(response.status, errorBody, response.headers, {
          endpoint: cleanPath,
          trId: options.trId ?? null,
        });
      }

      const jsonResult = (await response.json()) as {
        rt_cd?: string;
        msg_cd?: string;
      };

      // KIS는 HTTP 200이라도 rt_cd가 '0'이 아니면 비즈니스 에러
      if (jsonResult && jsonResult.rt_cd && jsonResult.rt_cd !== '0') {
        // 토큰 만료 에러 코드(EGW00121, EGW00123) 시 1회 재시도
        if (
          !isRetry &&
          (jsonResult.msg_cd === 'EGW00121' || jsonResult.msg_cd === 'EGW00123')
        ) {
          this.logger.warn(
            `[KisClient] KIS 토큰 만료 메시지(${jsonResult.msg_cd}) 감지. 토큰 재발급 후 재시도합니다.`,
          );
          this.tokenCache = null;
          this.invalidatedManualTokens.add(accessToken);
          await this.getAccessToken(true);
          return this.request<T>(endpoint, options, true);
        }

        this.logger.error(
          `[KisClient] 비즈니스 응답 에러 (rt_cd: ${jsonResult.rt_cd}): ${JSON.stringify(jsonResult)}`,
        );
        throwKisException(
          HttpStatus.BAD_REQUEST,
          jsonResult,
          response.headers,
          {
            endpoint: cleanPath,
            trId: options.trId ?? null,
          },
        );
      }

      return jsonResult as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.error(`[KisClient] 요청 타임아웃 (url: ${url})`);
        throwKisException(
          HttpStatus.SERVICE_UNAVAILABLE,
          'Request Timeout',
          null,
          {
            endpoint: cleanPath,
            trId: options.trId ?? null,
          },
        );
      }
      throw error;
    }
  }
}
