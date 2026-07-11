# Schema 관리

`schema.prisma`는 Prisma가 데이터베이스 구조를 이해하기 위한 중심 파일입니다.

이 파일에서 다음 내용을 관리합니다.

- 어떤 DB를 사용하는지
- Prisma Client를 어디에 생성할지
- 어떤 테이블과 컬럼을 사용할지
- 모델 간 관계를 어떻게 맺을지

## 현재 기본 구조

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "mysql"
}
```

`provider = "mysql"`이므로 MySQL/MariaDB 계열 DB를 기준으로 schema를 작성합니다.

DB 접속 URL은 `schema.prisma`에 직접 적지 않고, `prisma.config.ts`에서 `PRISMA_URL` 환경변수로 관리합니다.

## 모델 추가 예시

새 테이블이 필요하면 `schema.prisma`에 model을 추가합니다.

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

이 모델은 DB에서는 `User` 테이블로 관리되고, Prisma Client에서는 `prisma.user`로 접근합니다.

```ts
await prisma.user.findMany();
```

## 컬럼 타입 예시

```prisma
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- `Int`: 숫자
- `String`: 문자열
- `Boolean`: true/false
- `DateTime`: 날짜/시간
- `?`: nullable 컬럼
- `@default(...)`: 기본값
- `@unique`: unique 제약조건
- `@id`: primary key

## 관계 설정 예시

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}
```

`User` 한 명이 여러 `Post`를 가질 수 있는 1:N 관계입니다.

## Schema 변경 시 체크리스트

1. 모델/필드 이름이 서비스 코드에서 읽기 쉬운지 확인합니다.
2. nullable 여부를 의도적으로 정합니다.
3. unique, index, relation 같은 제약조건이 필요한지 확인합니다.
4. `yarn prisma format`을 실행합니다.
5. `yarn prisma validate`를 실행합니다.
6. 변경 내용을 마이그레이션으로 생성합니다.

## 주의할 점

- 운영 중인 테이블의 컬럼 삭제, 타입 변경, nullable 변경은 데이터 손실 가능성이 있습니다.
- schema만 수정하고 마이그레이션을 만들지 않으면 DB에는 반영되지 않습니다.
- Prisma Client 타입은 schema 기준으로 생성되므로, schema 변경 후에는 client generate가 필요할 수 있습니다.
