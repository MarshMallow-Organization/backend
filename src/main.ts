import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfigCreator } from './common/logger/winston.config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import {
  BEARER_AUTH_SECURITY_SCHEME,
  STUB_AUTH_SECURITY_SCHEME,
} from './common/swagger/securitySchemes';

/**
 * Swagger UI 상단에 걸리는 설명.
 *
 * 엔드포인트별 문서만으로는 알 수 없는 전역 규칙 — 응답 봉투와 실패 형태 —
 * 를 여기 한 번만 적는다. 프론트가 가장 자주 헛디디는 지점이라 예시까지 붙인다.
 */
const SWAGGER_DESCRIPTION = `
MarshMallow 백엔드 API 문서.

### 응답 형식

**성공 응답은 항상 \`data\`로 한 겹 감싸인다.** ResponseInterceptor가 전역으로 적용되기 때문이다.

\`\`\`json
{ "data": { "id": 1, "stockCode": "005930" } }
\`\`\`

axios를 쓴다면 실제 값은 \`response.data.data\`에 있다.

### 실패 형식

**실패 응답은 감싸이지 않는다.** 예외 필터가 본문을 직접 만들기 때문에 \`data\`가 없다.

\`\`\`json
{
  "code": "FAVORITE_STOCK_NOT_FOUND",
  "message": "등록된 관심종목이 아닙니다.",
  "traceId": "3f6b1c8e-1f0e-4a1d-9d3c-2b7a9f5e4c11"
}
\`\`\`

- \`code\`로 분기한다. HTTP 상태만으로는 같은 409 안에서 이름 중복과 개수 초과를 구분할 수 없다.
- \`message\`는 사용자에게 그대로 노출해도 되는 문구다.
- \`traceId\`는 서버 로그를 찾는 열쇠다. 문의를 남길 때 이 값을 함께 전달한다.

정의되지 않은 필드를 요청 본문에 넣으면 \`forbidNonWhitelisted\` 설정에 따라 400으로 거절된다.
모든 엔드포인트는 예기치 못한 오류 시 \`INTERNAL_SERVER_ERROR\` 코드의 500을 돌려줄 수 있다.
`.trim();

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

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
    .setDescription(SWAGGER_DESCRIPTION)
    .setVersion('1.0.0')
    /**
     * 현재 유일하게 동작하는 인증 수단. 실제 JWT 가드가 붙으면 이 스킴과
     * 컨트롤러의 @ApiSecurity를 함께 지우고 addBearerAuth 쪽으로 옮긴다.
     */
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-stub-user-id',
        in: 'header',
        description:
          '⚠️ 임시 스텁 인증. 토큰을 검증하지 않고 이 헤더의 값을 그대로 userId로 쓴다. 서버에 STUB_AUTH_ENABLED=true가 설정돼 있어야 하며, 비워두면 1번 사용자로 동작한다.',
      },
      STUB_AUTH_SECURITY_SCHEME,
    )
    /** /auths가 발급하는 토큰. 이를 검증하는 가드는 아직 없다. */
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          '⚠️ /auths가 토큰을 발급하기는 하지만, 이를 **검증하는 가드는 아직 없다.** 보호된 엔드포인트는 현재 x-stub-user-id로 동작한다.',
      },
      BEARER_AUTH_SECURITY_SCHEME,
    )
    /**
     * 문서화를 마친 도메인만 태그를 선언한다. 아직 작성 전인 도메인
     * (매매일기·인증)은 선언하지 않아, 컨트롤러에 @ApiTags가 붙지 않은
     * 상태와 문서가 어긋나지 않게 한다. 각 담당자가 문서를 채울 때
     * 자기 태그를 여기 한 줄 추가한다.
     */
    .addTag('관심종목', '사용자가 담아둔 관심종목 등록·조회·해제.')
    .addTag('가상계좌', '모의 투자용 가상계좌 CRUD와 순서 변경.')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('swagger', app, swaggerDocument, {
    customSiteTitle: 'MarshMallow API Docs',
    /** 스펙 원본. 프론트의 타입·클라이언트 생성에 쓴다. */
    jsonDocumentUrl: 'swagger/json',
    swaggerOptions: {
      /** 새로고침해도 입력한 인증값이 남는다. 스텁 헤더를 매번 다시 넣지 않아도 된다. */
      persistAuthorization: true,
      docExpansion: 'list',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
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
