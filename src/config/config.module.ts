import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { Module } from '@nestjs/common';

const appEnv = process.env.APP_ENV ?? 'local';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      /** local용 env 파일이 있으면 적용, 아니면 undefined로
       * (테섭하고 프로덕션은 환경변수 주입 방식으로 진행) */
      envFilePath: appEnv === 'local' ? '.env' : undefined,
      ignoreEnvFile: appEnv !== 'local',
      load: [configuration],
    }),
  ],
})
export class CustomConfigModule {}
