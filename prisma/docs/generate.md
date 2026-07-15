# Prisma Client Generate

Prisma Client generate는 `schema.prisma`를 기준으로 TypeScript에서 사용할 Prisma Client 코드를 생성하는 작업입니다.

현재 프로젝트는 Prisma Client를 기본 `node_modules/.prisma`가 아니라 아래 경로에 생성합니다.

```text
src/generated/prisma
```

이 설정은 `schema.prisma`의 generator에 정의되어 있습니다.

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```

## 생성 명령어

```bash
yarn prisma generate
```

schema를 수정했는데 타입이나 모델 접근 코드가 갱신되지 않았다면 이 명령어를 실행합니다.

## 언제 generate가 필요한가

- `schema.prisma`에 model을 추가했을 때
- 필드를 추가/삭제/수정했을 때
- relation을 추가하거나 수정했을 때
- Prisma Client 타입 에러가 schema 변경과 맞지 않을 때
- generated 폴더가 삭제되었을 때

## migrate dev와의 관계

로컬에서 다음 명령어를 실행하면 migration 생성과 함께 generate도 실행됩니다.

```bash
yarn prisma migrate dev --name <migration_name>
```

따라서 일반적인 schema 변경 흐름에서는 `migrate dev` 이후 별도로 `generate`를 실행하지 않아도 되는 경우가 많습니다.

단, DB 변경 없이 Prisma Client만 다시 만들고 싶다면 `yarn prisma generate`를 직접 실행합니다.

## 생성된 Client 사용 위치

현재 `PrismaService`는 생성된 client를 다음 경로에서 import합니다.

```ts
import { PrismaClient } from 'src/generated/prisma/client';
```

서비스 레이어에서는 직접 `PrismaClient`를 생성하지 않고, NestJS provider로 등록된 `PrismaService`를 주입받아 사용합니다.

```ts
constructor(private readonly prisma: PrismaService) {}
```

## Watch 모드

schema 변경 시 자동으로 generate를 다시 실행하고 싶다면 watch 모드를 사용할 수 있습니다.

```bash
yarn prisma generate --watch
```

## 주의할 점

- `src/generated/prisma`는 사람이 직접 수정하는 코드가 아닙니다.
- schema 변경 후 타입이 이상하면 먼저 `yarn prisma generate`를 실행합니다.
- generator output 경로를 바꾸면 `PrismaService`의 import 경로도 같이 바꿔야 합니다.
