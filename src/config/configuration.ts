export default () => ({
  /** 백엔드 서버 설정 */
  app: {
    env: process.env.APP_ENV ?? 'local',
    isProd: (process.env.APP_ENV ?? 'local') === 'production',
    port: Number(process.env.PORT ?? '3000'),
    name: process.env.APP_NAME ?? 'marshmallow-api-server',
    version: process.env.APP_VERSION ?? '1.0.0',
  },

  /** 데이터베이스 연결 설정 */
  database: {
    host: process.env.DB_HOSTNAME ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '3306'),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'password',
    database: process.env.DB_DATABASE ?? 'cgate',
  },
  /**
   * 임시 스텁 인증(StubAuthGuard) 활성화 여부.
   *
   * 명시적으로 'true'를 넣어야만 켜진다. app.env는 미설정 시 'local'로
   * 채워지므로 판정 기준으로 쓸 수 없다 — 환경변수를 깜빡한 배포가
   * 인증 우회로 이어진다. 실제 JWT 가드가 붙으면 이 항목도 함께 지운다.
   */
  auth: {
    stubEnabled: process.env.STUB_AUTH_ENABLED === 'true',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '14d',
  },
  /**
   * 프론트가 팝업(Google Identity Services code client)으로 authorization
   * code를 받아 우리 서버로 넘기는 방식이라, 리다이렉트로 돌아올 콜백
   * URL이 필요 없다(토큰 교환 시 redirect_uri는 고정값 'postmessage').
   */
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  cors: {
    origin: process.env.FRONTEND_ORIGIN,
  },
  toss: {
    developerMode:
      process.env.TOSS_DEVELOPER_MODE !== undefined
        ? process.env.TOSS_DEVELOPER_MODE === 'true'
        : (process.env.APP_ENV ?? 'local') !== 'production',
    clientKey: process.env.TOSS_CLIENT_KEY,
    clientSecret: process.env.TOSS_CLIENT_SECRET,
    accessToken: process.env.TOSS_ACCESS_TOKEN,
  },
  /** AwsKmsEncryptionAdapter(EncryptionAdapter의 유일한 구현체)가 쓰는 값들. */
  encryption: {
    region: process.env.AWS_REGION,
    keyArn: process.env.AWS_KMS_KEY_ARN,
    /**
     * 로컬 개발은 IAM 사용자 액세스키/시크릿을 쓴다. 배포 환경에서
     * IAM 롤을 쓰면 이 둘은 비워두고, AwsKmsEncryptionAdapter가 SDK
     * 기본 자격증명 체인에 맡기게 한다.
     */
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  /**
   * 임시 보유종목 스텁(HoldingsProvider) 활성화 여부.
   *
   * auth.stubEnabled와 같은 이유로 별도 플래그를 쓴다. app.env가 미설정
   * 시 'local'로 채워지는 걸 배포 환경 판정에 쓰면, 환경변수를 깜빡한
   * 배포에서 모든 사용자에게 같은 가짜 자산이 노출된다. 실제 토스
   * holdings 연동(GET /api/v1/holdings)이 붙으면 이 항목도 함께 지운다.
   */
  holdings: {
    stubEnabled: process.env.HOLDINGS_STUB_ENABLED === 'true',
  },

  kis: {
    appKey: process.env.KIS_APP_KEY,
    appSecret: process.env.KIS_APP_SECRET,
    accessToken: process.env.KIS_ACCESS_TOKEN,
    approvalKey: process.env.KIS_APPROVAL_KEY,
    /**
     * KIS 실시간 웹소켓(OrdersWatcherService) 부팅 시 자동 연결 여부.
     * domains/orders와 배선되기 전까지는 연결해봐야 유휴 소켓이 KIS 실전
     * 서버에 무한 재접속만 하므로 기본값 off. 배선 완료 후 'true'로 켠다.
     */
    wsEnabled: process.env.KIS_WS_ENABLED === 'true',
  },
});
