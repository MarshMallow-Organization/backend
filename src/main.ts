import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfigCreator } from './common/logger/winston.config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  /** 기본 로거 윈스턴으로 교체 */
  app.useLogger(
    WinstonModule.createLogger(winstonConfigCreator(configService)),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string>('cors.origin'),
    credentials: true,
  });

  /** 요청 DTO의 변환과 유효성 검사를 전역으로 적용한다. */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get<number>('app.port') ?? 3000;
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MarshMallow API')
    .setDescription('MarshMallow 백엔드 API 문서')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('swagger', app, swaggerDocument, {
    customSiteTitle: 'MarshMallow API Docs',
  });

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
