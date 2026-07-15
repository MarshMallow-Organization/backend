# Config Module

`config` 모듈은 애플리케이션에서 사용하는 환경변수를 한 곳에서 읽고,
서비스/모듈에서 `ConfigService`로 꺼내 쓸 수 있게 만드는 전역 설정 모듈입니다.

현재 구조는 다음과 같습니다.

- `config.module.ts`: Nest의 `ConfigModule`을 등록합니다.
- `configuration.ts`: 환경변수를 도메인별 객체로 정리합니다.
- `app.module.ts`: `CustomConfigModule`을 import 해서 앱 전체에서 설정을 사용할 수 있게 합니다.

## 동작 방식

`CustomConfigModule`은 `ConfigModule.forRoot()`를 사용합니다.

```ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: appEnv === 'local' ? '.env' : undefined,
  ignoreEnvFile: appEnv !== 'local',
  load: [configuration],
});
```

- `isGlobal: true`: 다른 모듈에서 `ConfigModule`을 다시 import 하지 않아도 `ConfigService`를 주입받을 수 있습니다.
- `APP_ENV=local`: 로컬 환경에서는 `.env` 파일을 읽습니다.
- `APP_ENV`가 `local`이 아니면: `.env` 파일을 무시하고, 서버/배포 환경에 주입된 환경변수를 사용합니다.
- `load: [configuration]`: `configuration.ts`에서 만든 설정 객체를 `ConfigService`로 조회할 수 있게 등록합니다.

## 환경변수 추가 방법

예를 들어 JWT secret을 추가한다고 하면 다음 순서로 진행합니다.

### 1. `.env`에 값 추가

로컬에서 사용할 값을 `.env`에 추가합니다.

```env
JWT_SECRET=local-jwt-secret
```

새로운 환경변수는 협업자가 참고할 수 있도록 `.env.example`에도 같은 키를 추가하는 것이 좋습니다.

```env
JWT_SECRET=
```

### 2. `configuration.ts`에 설정 추가

`src/config/configuration.ts`에서 도메인별로 설정을 추가합니다.

```ts
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

  jwt: {
    secret: process.env.JWT_SECRET ?? 'local-jwt-secret',
  },
});
```

이렇게 추가하면 `ConfigService`에서 `jwt.secret` 키로 값을 조회할 수 있습니다.

## 서비스 레이어에서 사용하는 방법

서비스에서는 생성자에 `ConfigService`를 주입해서 사용합니다.

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  getJwtSecret(): string {
    return this.configService.get<string>('jwt.secret') ?? '';
  }
}
```

현재 프로젝트의 `PrismaService`도 같은 방식으로 데이터베이스 설정을 가져옵니다.

```ts
const host = configService.get<string>('database.host');
const port = configService.get<number>('database.port');
const username = configService.get<string>('database.username');
const password = configService.get<string>('database.password');
const database = configService.get<string>('database.database');
```

`main.ts`에서는 앱 실행 포트를 가져올 때 사용하고 있습니다.

```ts
const configService = app.get(ConfigService);
const port = configService.get<number>('app.port') ?? 3000;

await app.listen(port);
```

## 추가할 때 주의할 점

- 환경변수 이름은 대문자와 `_` 조합으로 작성합니다. 예: `JWT_SECRET`, `DB_HOSTNAME`
- `configuration.ts`에서는 앱 내부에서 읽기 쉬운 객체 형태로 바꿉니다. 예: `jwt.secret`, `database.host`
- 숫자 값은 `Number(...)`로 변환해서 등록합니다. 예: `Number(process.env.PORT ?? '3000')`
- 비밀번호, secret, token 같은 민감한 값은 코드에 실제 운영 값을 직접 적지 않습니다.
- 배포 환경에서는 `.env` 파일 대신 서버 환경변수로 주입하는 것을 기준으로 합니다.
