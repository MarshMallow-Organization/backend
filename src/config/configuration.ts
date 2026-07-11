export default () => ({
  app: {
    env: process.env.APP_ENV ?? 'local',
    port: Number(process.env.PORT ?? '3000'),
  },

  database: {
    host: process.env.DB_HOSTNAME ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '3306'),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'password',
    database: process.env.DB_DATABASE ?? 'cgate',
  },
});
