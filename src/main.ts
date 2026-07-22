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
// eslint-disable-next-line
bootstrap();
