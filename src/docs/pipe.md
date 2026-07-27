# Pipe 개념과 사용 전략

## Pipe란

`Pipe`는 컨트롤러의 핸들러(라우트 메서드)가 요청 데이터를 받기 직전에 실행되는 전처리 로직입니다.

Pipe는 두 가지 역할을 합니다.

- **변환(Transformation)**: 입력 데이터를 원하는 형태로 변환합니다. (예: 문자열 `"1"` → 숫자 `1`, 평범한 객체 → DTO 클래스 인스턴스)
- **검증(Validation)**: 입력 데이터가 유효한지 검사하고, 유효하지 않으면 예외를 던져 핸들러 실행 자체를 막습니다.

Pipe는 `@Injectable()`이 붙은 클래스이며 `PipeTransform` 인터페이스를 구현합니다.

```ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('숫자로 변환할 수 없습니다.');
    }
    return val;
  }
}
```

## 이 프로젝트에서 사용하는 방식: ValidationPipe + class-validator + class-transformer

Nest는 `class-validator`, `class-transformer`와 결합해 DTO 기반 검증을 지원하는 내장 `ValidationPipe`를 제공합니다.

1. DTO 클래스에 `class-validator` 데코레이터로 검증 규칙을 선언합니다.

```ts
import { IsEmail, IsInt, Min } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsInt()
  @Min(0)
  age: number;
}
```

2. 컨트롤러 핸들러의 파라미터 타입으로 DTO를 지정합니다.

```ts
@Post()
createUser(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}
```

3. `ValidationPipe`가 요청 body(plain object)를 `class-transformer`로 `CreateUserDto` 인스턴스로 변환한 뒤, `class-validator`로 검증합니다. 검증에 실패하면 자동으로 `400 Bad Request`를 응답합니다.

## 어디에 붙일 것인가: 전역 vs 컨트롤러(핸들러)

Pipe는 적용 범위에 따라 4단계로 붙일 수 있습니다. 범위가 좁을수록 구체적인 예외 처리가 가능하고, 범위가 넓을수록 일관성을 확보하기 쉽습니다.

### 1. 전역 (Global)

앱 전체의 모든 요청에 동일한 검증/변환 규칙을 적용하고 싶을 때 사용합니다. `class-validator` 기반 DTO 검증은 대부분의 엔드포인트에 공통으로 필요하므로, 이 프로젝트에서는 **전역 등록을 기본 전략**으로 합니다.

```ts
// main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 오면 에러
      transform: true, // plain object를 DTO 클래스 인스턴스로 변환
    }),
  );

  await app.listen(3000);
}
```

- 장점: 모든 컨트롤러에서 별도 설정 없이 DTO 검증이 동작합니다. 컨트롤러 코드가 검증 로직 없이 깔끔해집니다.
- 주의: DI 컨테이너를 거치지 않으므로 다른 모듈을 주입해야 하는 Pipe는 전역에서 이 방식으로 등록할 수 없습니다. (이런 경우 `APP_PIPE` 토큰으로 `AppModule`의 `providers`에 등록하면 DI를 사용할 수 있습니다.)

### 2. 컨트롤러 단위

특정 컨트롤러의 모든 핸들러에만 규칙을 적용하고 싶을 때 사용합니다.

```ts
@UsePipes(new ValidationPipe())
@Controller('users')
export class UserController {}
```

전역 설정과 다른 옵션이 필요한 특정 도메인이 있을 때만 예외적으로 사용합니다.

### 3. 핸들러(메서드) 단위

하나의 라우트 핸들러에만 적용하고 싶을 때 사용합니다.

```ts
@Post()
@UsePipes(new ValidationPipe())
createUser(@Body() dto: CreateUserDto) {}
```

### 4. 파라미터 단위

특정 파라미터 하나에만 적용하고 싶을 때 사용합니다. 주로 `ParseIntPipe`, `ParseUUIDPipe`처럼 단순 타입 변환에 사용합니다.

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}
```

## 적용 기준

- DTO(body/query)에 대한 검증은 전역 `ValidationPipe`로 일괄 처리합니다.
- 라우트 파라미터(`:id` 등)의 타입 변환처럼 간단하고 국소적인 처리는 파라미터 단위 Pipe(`ParseIntPipe` 등)를 사용합니다.
- 특정 컨트롤러/핸들러만 전역 규칙과 다른 검증 옵션이 필요할 때만 컨트롤러/핸들러 단위 Pipe를 예외적으로 사용합니다.
