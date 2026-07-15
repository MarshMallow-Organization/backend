# Migration 관리

Migration은 `schema.prisma` 변경 내용을 실제 DB 변경 SQL로 남기는 작업입니다.

Prisma는 schema 변경 내용을 기준으로 `prisma/migrations` 폴더에 마이그레이션 이력을 생성합니다.

## 로컬 개발에서 마이그레이션 만들기

`schema.prisma`를 수정한 뒤 다음 명령어를 실행합니다.

```bash
yarn prisma migrate dev --name <migration_name>
```

예시:

```bash
yarn prisma migrate dev --name add_user_model
```

이 명령어는 다음 작업을 수행합니다.

- schema 변경 내용을 분석합니다.
- `prisma/migrations` 폴더에 새 migration SQL을 생성합니다.
- 로컬 DB에 migration을 적용합니다.
- generator를 실행해서 Prisma Client를 갱신합니다.

## 마이그레이션 이름 규칙

마이그레이션 이름은 변경 내용을 짧고 명확하게 적습니다.

```bash
yarn prisma migrate dev --name add_user_model
yarn prisma migrate dev --name add_post_author_relation
yarn prisma migrate dev --name add_user_deleted_at
```

추천 형식:

- `add_<대상>`
- `update_<대상>`
- `remove_<대상>`
- `add_<대상>_<필드명>`

## 배포 환경에서 마이그레이션 적용

운영/스테이징 환경에서는 새 migration을 만들지 않고, 이미 만들어진 migration만 적용합니다.

```bash
yarn prisma migrate deploy
```

`migrate deploy`는 `prisma/migrations`에 있는 아직 적용되지 않은 migration만 DB에 반영합니다.

## 마이그레이션 상태 확인

```bash
yarn prisma migrate status
```

현재 DB에 어떤 migration이 적용되었는지, 누락된 migration이 있는지 확인할 수 있습니다.

## 로컬 DB 초기화

로컬 개발 중 DB를 완전히 초기화하고 migration을 처음부터 다시 적용하려면 다음 명령어를 사용합니다.

```bash
yarn prisma migrate reset
```

주의: 이 명령어는 DB 데이터를 삭제합니다. 로컬 개발 DB에서만 사용하세요.

## 빠른 프로토타이핑

마이그레이션 파일을 만들지 않고 schema를 DB에 바로 밀어 넣고 싶을 때는 다음 명령어를 사용할 수 있습니다.

```bash
yarn prisma db push
```

다만 이 프로젝트에서는 DB 변경 이력을 남기는 것이 중요하므로, 일반적인 개발 흐름에서는 `migrate dev`를 우선 사용합니다.

## 기존 DB에서 schema 가져오기

이미 존재하는 DB 구조를 `schema.prisma`로 가져오려면 다음 명령어를 사용합니다.

```bash
yarn prisma db pull
```

이 명령어는 DB를 introspection해서 `schema.prisma`를 갱신합니다.

## 권장 흐름

1. `schema.prisma` 수정
2. `yarn prisma format`
3. `yarn prisma validate`
4. `yarn prisma migrate dev --name <migration_name>`
5. 생성된 SQL 확인
6. 애플리케이션 코드 수정
7. 필요한 경우 seed 데이터 갱신

## 주의할 점

- 운영 DB에서는 `migrate dev`나 `migrate reset`을 사용하지 않습니다.
- migration 파일은 DB 변경 이력이므로 임의로 삭제하거나 수정하지 않습니다.
- 이미 공유된 migration을 수정해야 한다면 팀과 먼저 합의해야 합니다.
- 컬럼 삭제/타입 변경은 데이터 손실 가능성이 있으므로 생성된 SQL을 꼭 확인합니다.
