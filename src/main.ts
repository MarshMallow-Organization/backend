import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfigCreator } from './winston/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  /** 기본 로거 윈스턴으로 교체 */
  app.useLogger(
    WinstonModule.createLogger(winstonConfigCreator(configService)),
  );

  const port = configService.get<number>('app.port') ?? 3000;

  await app.listen(port ?? 3000);
}

/**
 * 부팅 실패(NestFactory.create·onModuleInit·app.listen 등)를 방어한다.
 * 이 구간은 ProcessExceptionHandler가 등록되기 전이라 여기서 잡아야 하고,
 * winston도 아직 준비 전일 수 있어 console으로 남긴 뒤 종료한다.
 */
bootstrap().catch((error) => {
  console.error('Failed to bootstrap application', error);
  process.exit(1);
});
