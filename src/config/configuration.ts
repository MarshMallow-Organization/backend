export default () => ({
  /** 백엔드 서버 설정 */
  app: {
    env: process.env.APP_ENV ?? 'local',
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
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  cors: {
    origin: process.env.FRONTEND_ORIGIN,
  },
});
