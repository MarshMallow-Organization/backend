# Swagger API 문서 제작 가이드

## 1. 목적

Swagger API 문서는 백엔드 API의 URL, 요청값, 응답값, 인증 방식과 오류 응답을 정의한 문서다.

이 프로젝트에서는 NestJS가 생성한 OpenAPI 명세를 Swagger UI로 제공한다. 이를 통해 다음과 같은 효과를 얻을 수 있다.

- 프론트엔드와 백엔드가 동일한 API 계약을 기준으로 개발할 수 있다.
- 브라우저에서 API를 직접 호출하고 결과를 확인할 수 있다.
- 요청 DTO의 필수 여부와 유효성 조건을 쉽게 확인할 수 있다.
- 성공 및 실패 응답의 형식을 명확하게 공유할 수 있다.
- OpenAPI 명세를 이용해 클라이언트 타입이나 SDK를 생성할 수 있다.

## 2. Swagger 패키지 설치

프로젝트 루트에서 다음 명령어를 실행한다.

```bash
yarn add @nestjs/swagger
```

Swagger UI에 필요한 기능은 `@nestjs/swagger`에 포함되어 있으므로 별도의 UI 패키지는 설치하지 않는다.

## 3. Swagger 기본 설정

`src/main.ts`에 다음 import를 추가한다.

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
```

`app.listen()`을 호출하기 전에 Swagger 문서를 생성하고 UI를 등록한다.

```typescript
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
```

적용 위치를 포함한 구조는 다음과 같다.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 로거, CORS, ValidationPipe 등 기존 설정

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

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);
}
```

`.addBearerAuth()`는 Swagger UI에서 JWT Bearer 인증을 사용할 수 있도록 인증 방식을 명세에 등록한다. 실제 인증 처리는 NestJS Guard가 담당한다.

## 4. Swagger UI 확인

개발 서버를 실행한다.

```bash
yarn dev
```

다음 주소에서 Swagger UI를 확인한다.

```text
http://localhost:3000/swagger
```

OpenAPI JSON 명세는 다음 주소에서 확인할 수 있다.

```text
http://localhost:3000/swagger-json
```

포트가 환경변수로 변경된 경우 `3000` 대신 실제 서버 포트를 사용한다.

## 5. 요청 DTO 문서화

`class-validator` 데코레이터는 실제 요청값을 검증한다. `@ApiProperty()`와 `@ApiPropertyOptional()`은 해당 필드를 Swagger 명세에 설명한다.

- 필수 필드: `@ApiProperty()`
- 선택 필드: `@ApiPropertyOptional()`

예를 들어 `GetDiariesQueryDto`는 다음과 같이 문서화할 수 있다.

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const DIARY_MAX_SIZE = 20;

export class GetDiariesQueryDto {
  @ApiPropertyOptional({
    description: '페이지 번호이며 0부터 시작한다.',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({
    description: '페이지당 조회할 일지 개수',
    example: 10,
    minimum: 1,
    maximum: DIARY_MAX_SIZE,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DIARY_MAX_SIZE)
  size?: number;

  @ApiPropertyOptional({
    description: '조회할 일자 목록',
    type: [String],
    example: ['2026-08-12', '2026-08-13'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsDateString({}, { each: true })
  dates?: string[];

  @ApiPropertyOptional({
    description: '조회 시작일',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '조회 종료일',
    example: '2026-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '조회할 기업 이름 목록',
    type: [String],
    example: ['삼성전자', '카카오'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsString({ each: true })
  companies?: string[];
}
```

배열, enum, nullable 속성, 중첩 DTO는 타입을 명시적으로 작성하는 것이 안전하다.

## 6. 응답 DTO 문서화

먼저 목록의 각 항목을 나타내는 DTO를 문서화한다.

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class DiaryPreviewDto {
  @ApiProperty({ description: '매매 일지 ID', example: 1 })
  diaryId: number;

  @ApiProperty({ description: '주문 ID', example: 100 })
  orderId: number;

  @ApiProperty({
    description: '거래 유형',
    enum: ['BUY', 'SELL'],
    example: 'BUY',
  })
  type: 'BUY' | 'SELL';

  @ApiProperty({ description: '거래 날짜', example: '2026-08-13' })
  date: string;

  @ApiProperty({ description: '기업 코드', example: '005930' })
  corpCode: string;

  @ApiProperty({ description: '기업 이름', example: '삼성전자' })
  corpName: string;

  @ApiProperty({
    description: '평균 거래 가격',
    example: 72000,
    nullable: true,
  })
  avgPrice: number | null;

  @ApiProperty({ description: '거래 수량', example: 10 })
  quantity: number;

  @ApiProperty({ description: '작성한 메모', example: '실적 발표 후 매수' })
  memo: string;

  @ApiProperty({
    description: '일지 생성 시각',
    example: '2026-08-13T10:30:00.000Z',
  })
  createdAt: string;
}
```

페이지 응답 DTO는 다음과 같이 작성한다.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { DiaryPreviewDto } from './diary-preview.dto';

export class GetDiariesResponseDto {
  @ApiProperty({
    description: '조회된 일지 목록',
    type: [DiaryPreviewDto],
  })
  items: DiaryPreviewDto[];

  @ApiProperty({ description: '현재 페이지', example: 0 })
  page: number;

  @ApiProperty({ description: '페이지 크기', example: 10 })
  size: number;

  @ApiProperty({ description: '전체 항목 개수', example: 32 })
  totalElements: number;

  @ApiProperty({ description: '전체 페이지 개수', example: 4 })
  totalPages: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNext: boolean;
}
```

## 7. Controller 문서화

Controller에는 API 그룹, 목적, 입력값과 응답 상태를 작성한다.

```typescript
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Diaries')
@Controller('diaries')
export class DiariesController {
  constructor(private readonly diariesService: DiariesService) {}

  @Get()
  @ApiOperation({
    summary: '매매 일지 목록 조회',
    description:
      '날짜와 기업 조건을 사용하여 사용자의 매매 일지를 페이지 단위로 조회한다.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: '임시 사용자 식별 헤더',
    required: true,
    example: '1',
  })
  @ApiBadRequestResponse({
    description: 'x-user-id 또는 Query Parameter가 올바르지 않음',
  })
  getDiaries(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Query() query: GetDiariesQueryDto,
  ): Promise<GetDiariesResponseDto> {
    const userId = Number(userIdHeader);

    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('x-user-id 헤더가 올바르지 않습니다.');
    }

    return this.diariesService.getDiaries(userId, query);
  }
}
```

주요 Controller 데코레이터의 역할은 다음과 같다.

| 데코레이터 | 역할 |
| --- | --- |
| `@ApiTags()` | API를 도메인별 그룹으로 분류한다. |
| `@ApiOperation()` | API의 이름과 상세 설명을 작성한다. |
| `@ApiHeader()` | 요청 헤더를 문서화한다. |
| `@ApiOkResponse()` | 200 성공 응답을 문서화한다. |
| `@ApiCreatedResponse()` | 201 생성 성공 응답을 문서화한다. |
| `@ApiBadRequestResponse()` | 400 오류 응답을 문서화한다. |
| `@ApiNotFoundResponse()` | 404 오류 응답을 문서화한다. |
| `@ApiBearerAuth()` | JWT Bearer 인증이 필요한 API임을 표시한다. |

## 8. 공통 응답 구조 반영

이 프로젝트의 `ResponseInterceptor`는 정상 응답을 다음 형식으로 감싼다.

```json
{
  "data": {
    "items": [],
    "page": 0
  }
}
```

따라서 `GetDiariesResponseDto`만 성공 응답 타입으로 등록하면 Swagger 문서와 실제 응답 구조가 달라진다.

다음과 같이 `data` 속성을 포함한 스키마를 등록한다.

```typescript
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

@ApiExtraModels(GetDiariesResponseDto)
@ApiOkResponse({
  description: '매매 일지 목록 조회 성공',
  schema: {
    type: 'object',
    properties: {
      data: {
        $ref: getSchemaPath(GetDiariesResponseDto),
      },
    },
  },
})
```

API가 많아지면 공통 응답 데코레이터를 만든다.

```typescript
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export function ApiDataResponse<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          data: {
            $ref: getSchemaPath(model),
          },
        },
      },
    }),
  );
}
```

Controller에서는 다음처럼 사용할 수 있다.

```typescript
@ApiDataResponse(GetDiariesResponseDto)
@Get()
getDiaries() {
  // ...
}
```

## 9. JWT 인증 문서화

JWT 인증이 필요한 Controller 또는 메서드에 `@ApiBearerAuth()`를 추가한다.

```typescript
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Get('me')
getMyProfile() {
  // ...
}
```

Swagger UI의 `Authorize` 버튼에서 JWT를 입력하면 다음 헤더를 포함하여 API를 호출할 수 있다.

```http
Authorization: Bearer eyJhbGciOi...
```

`@ApiBearerAuth()`는 인증 방식을 문서화할 뿐 실제 접근을 차단하지 않는다. 실제 인증과 권한 검증은 Guard로 구현해야 한다.

## 10. Swagger CLI 플러그인 사용

DTO마다 반복적으로 `@ApiProperty()`를 작성하는 작업을 줄이려면 Swagger CLI 플러그인을 활성화할 수 있다.

`nest-cli.json`을 다음과 같이 수정한다.

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

플러그인은 다음 정보를 자동으로 OpenAPI 스키마에 반영한다.

- DTO 속성 타입
- 선택 속성의 `?`
- 배열 타입
- `class-validator`의 일부 유효성 조건
- DTO와 Controller에 작성한 주석

플러그인을 사용하더라도 비즈니스 의미, 현실적인 예시, 오류 발생 조건은 직접 작성하는 것이 좋다.

설정을 변경한 후 다시 빌드하고 실행한다.

```bash
yarn build
yarn dev
```

## 11. 운영 환경 주의사항

Swagger UI에는 API 구조와 테스트 기능이 노출된다. 운영 환경에서는 다음 방법 중 하나를 적용한다.

- 개발 환경에서만 Swagger를 등록한다.
- Swagger 경로에 별도의 인증을 적용한다.
- 내부 네트워크에서만 접근할 수 있도록 제한한다.

환경에 따라 Swagger를 등록하려면 다음처럼 분기할 수 있다.

```typescript
if (configService.get<string>('app.env') !== 'production') {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MarshMallow API')
    .setDescription('MarshMallow 백엔드 API 문서')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, swaggerDocument);
}
```

사용하는 환경변수 이름은 프로젝트의 실제 설정 구조에 맞춰 조정한다.

## 12. 최종 검증 목록

Swagger UI에서 다음 항목을 확인한다.

- `Diaries` 등 도메인별 API 그룹이 표시되는가?
- HTTP 메서드와 URL이 실제 Controller와 일치하는가?
- Header, Path, Query, Body 입력값을 모두 입력할 수 있는가?
- 필수값과 선택값이 올바르게 표시되는가?
- DTO의 배열, enum, nullable 타입이 올바르게 표시되는가?
- 성공 응답이 실제 `{ data: ... }` 구조와 일치하는가?
- 400, 401, 403, 404 등 주요 오류 응답이 작성되어 있는가?
- JWT 인증 API를 `Authorize` 버튼으로 호출할 수 있는가?
- Swagger UI의 `Try it out` 결과가 실제 API 응답과 일치하는가?

## 13. 권장 적용 순서

```text
@nestjs/swagger 설치
        ↓
main.ts에서 Swagger UI 등록
        ↓
요청 DTO 문서화
        ↓
응답 DTO 문서화
        ↓
Controller 설명과 상태 코드 추가
        ↓
공통 { data: T } 응답 반영
        ↓
JWT 인증 방식 반영
        ↓
Swagger UI에서 실제 요청 검증
```

Swagger 문서는 한 번 작성하고 끝내는 문서가 아니다. API 코드가 변경될 때 DTO, Controller와 Swagger 설명도 함께 수정해야 실제 구현과 문서 사이의 차이를 방지할 수 있다.

