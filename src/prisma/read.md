# Prisma Folder

이 폴더는 애플리케이션에서 데이터베이스에 접근하기 위한 Prisma 관련 코드를 모아둔 곳입니다.

Prisma Client를 NestJS 서비스로 감싸서, 다른 서비스나 모듈에서 데이터베이스 기능을 주입받아 사용할 수 있게 합니다.

## 파일 구성

- `prisma.module.ts`: `PrismaService`를 provider로 등록하고, 다른 모듈에서 사용할 수 있도록 export합니다.
- `prisma.service.ts`: Prisma Client를 확장한 서비스입니다. DB 연결 설정, 연결 시작, 연결 종료를 담당합니다.

## 동작 방식

`PrismaModule`은 `PrismaService`를 제공합니다.

```ts
@Module({
  imports: [],
  exports: [PrismaService],
  providers: [PrismaService],
})
export class PrismaModule {}
```

`PrismaService`는 `ConfigService`에서 database 설정을 읽어 MariaDB adapter (MySQL도 MariaDB를 사용한다고 공식문서에 언급되어 있음)를 만들고,
그 adapter를 사용해 Prisma Client를 초기화합니다.

```ts
const host = configService.get<string>('database.host');
const port = configService.get<number>('database.port');
const username = configService.get<string>('database.username');
const password = configService.get<string>('database.password');
const database = configService.get<string>('database.database');
```

앱이 실행될 때는 `onModuleInit()`에서 DB에 연결하고, `SELECT 1` 쿼리로 연결 여부를 확인합니다.

앱이 종료될 때는 `onModuleDestroy()`에서 DB 연결을 끊습니다.

## 사용하는 이유

- DB 연결 설정을 한 곳에서 관리할 수 있습니다.
- Prisma Client를 NestJS의 의존성 주입 방식으로 사용할 수 있습니다.
- 여러 서비스에서 같은 `PrismaService`를 재사용할 수 있습니다.
- 앱 시작/종료 시점에 DB 연결과 해제를 명확하게 처리할 수 있습니다.

## 사용 예시

다른 서비스에서 DB를 사용하려면 `PrismaService`를 생성자에 주입하면 됩니다.

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findUsers() {
    return this.prisma.user.findMany();
  }
}
```
