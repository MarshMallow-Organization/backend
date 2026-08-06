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
    port: Number(process.env.DB_PORT ?? '3310'),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'password',
    database: process.env.DB_DATABASE ?? 'cgate',
  },
});
