import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  BEARER_AUTH_SECURITY_SCHEME,
  STUB_AUTH_SECURITY_SCHEME,
} from './securitySchemes';

/**
 * Swagger UI 상단에 걸리는 설명.
 *
 * 엔드포인트별 문서만으로는 알 수 없는 전역 규칙 — 성공은 data로 감싸이고
 * 실패는 감싸이지 않는다는 것 — 만 적는다. 프론트가 가장 자주 헛디디는
 * 지점이라 예시로 보여준다.
 */
const SWAGGER_DESCRIPTION = `
### Success Response

\`\`\`
{ "data": { "id": 1, "stockCode": "005930" } }
\`\`\`

### Error Response

\`\`\`
{
  "code": "FAVORITE_STOCK_NOT_FOUND",
  "message": "등록된 관심종목이 아닙니다.",
  "traceId": "3f6b1c8e-1f0e-4a1d-9d3c-2b7a9f5e4c11"
}
\`\`\`

- \`traceId\`는 서버 로그로, 문의를 남길 때 이 값을 함께 전달한다.
- 모든 엔드포인트는 예기치 못한 오류 시 \`INTERNAL_SERVER_ERROR\` 코드의 500을 돌려줄 수 있다.
`.trim();

/**
 * Swagger 문서를 만들어 /swagger에 띄운다.
 *
 * main.ts에 두지 않는 이유는 winston과 같다(winston.config.ts). main.ts는
 * 부팅 순서를 읽는 자리이고, 설정 본문이 끼어들면 그 순서가 안 보인다.
 * 문서를 채우는 작업은 앞으로도 계속 생기는데(담당자별 태그 추가 등),
 * 그때마다 네 사람이 함께 쓰는 main.ts를 여는 것도 피한다.
 *
 * 보안 스킴 이름은 컨트롤러의 @ApiSecurity와 문자열로 맞아야 하므로
 * securitySchemes.ts의 상수를 쓴다. 여기서 스킴을 빼면 그것을 참조하는
 * 컨트롤러 쪽이 붕 뜨니 함께 정리해야 한다.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
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

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('swagger', app, document, {
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
}
