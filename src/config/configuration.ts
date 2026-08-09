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
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '14d',
    devAccessExpiresIn: process.env.JWT_DEV_ACCESS_EXPIRES_IN ?? '7d',
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
