# Prisma

이 폴더는 Prisma로 데이터베이스 스키마, 마이그레이션, Prisma Client 생성, seed 데이터를 관리하는 곳입니다.

NestJS 런타임에서 Prisma를 주입받아 사용하는 코드는 `src/prisma`에 있고,
이 폴더는 DB 구조를 정의하고 변경 이력을 관리하는 개발/운영용 Prisma 작업 공간입니다.

## 주요 파일

- `schema.prisma`: Prisma schema 파일입니다. DB 모델, datasource, generator를 정의합니다.
- `migrations/`: `prisma migrate dev`로 생성되는 마이그레이션 SQL 이력이 저장됩니다.
- `docs/`: Prisma 사용법을 주제별로 나눈 문서 폴더입니다.

## 현재 프로젝트 설정

현재 Prisma Client는 `schema.prisma`의 generator 설정에 따라 `src/generated/prisma`에 생성됩니다.

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```

Prisma CLI가 사용할 DB URL은 `prisma.config.ts`에서 `PRISMA_URL` 환경변수로 읽습니다.

```ts
datasource: {
  url: process.env['PRISMA_URL'],
}
```

로컬에서 Prisma 명령어를 실행하려면 `.env`에 `PRISMA_URL`이 설정되어 있어야 합니다.

## 문서 목록

- [Schema 관리](./docs/schema.md)
- [Migration 관리](./docs/migration.md)
- [Prisma Client generate](./docs/generate.md)
- [Seeder 관리](./docs/seed.md) --> 아직 미구현이라서 나중에 추가하겠습니다.

## 자주 쓰는 명령어

```bash
# schema.prisma 문법 검사
yarn prisma validate

# schema.prisma 포맷 정리
yarn prisma format

# 마이그레이션 생성 + DB 적용 + Prisma Client 생성
yarn prisma migrate dev --name <migration_name>

# 운영/배포 환경에서 아직 적용되지 않은 마이그레이션 적용
yarn prisma migrate deploy

# Prisma Client 직접 생성
yarn prisma generate

# seed 실행
yarn prisma db seed

# DB를 브라우저에서 확인
yarn prisma studio
```

## 기본 작업 흐름

1. `schema.prisma`에서 모델을 추가하거나 수정합니다.
2. `yarn prisma format`으로 schema 형식을 정리합니다.
3. `yarn prisma validate`로 schema가 유효한지 확인합니다.
4. `yarn prisma migrate dev --name <migration_name>`으로 마이그레이션을 생성하고 로컬 DB에 적용합니다.
5. 생성된 `prisma/migrations` 파일을 확인합니다.
6. 필요한 경우 `yarn prisma generate`로 Prisma Client를 다시 생성합니다.
7. 서비스 코드에서 `PrismaService`를 통해 새 모델을 사용합니다.
