# App Module 관리 전략

`AppModule`은 애플리케이션의 루트 모듈입니다.

현재 프로젝트에서는 `@Module()` 데코레이터 안에 모듈을 바로 나열하지 않고,
먼저 `imports` 배열을 따로 만든 뒤 `@Module()`에 주입하는 방식을 사용합니다.

```ts
// 운영 환경에서 뺄것 분기처리 하기
const imports = [CustomConfigModule, PrismaModule];

@Module({
  imports: [...imports],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## 이 전략을 사용하는 이유

전역으로 관리해야 하는 모듈이 늘어나면 `AppModule`의 `imports`가 쉽게 복잡해집니다.

그래서 import 대상 모듈을 별도 배열로 분리해두면 다음 장점이 있습니다.

- 앱 전체에서 사용하는 핵심 모듈을 한 곳에서 확인할 수 있습니다.
- 설정 모듈, ORM 모듈, 인증 모듈처럼 전역 성격의 모듈을 그룹으로 관리할 수 있습니다.
- 운영 환경에서 제외할 모듈이 생겼을 때 조건 분기를 넣기 쉽습니다.
- `@Module()` 데코레이터는 controllers/providers 같은 NestJS 메타데이터 선언에 집중할 수 있습니다.
- 모듈 추가/제거 시 변경 지점이 명확해져 AppModule이 덜 복잡해집니다.

## 환경별 분기 예시

나중에 로컬 개발에서만 사용하는 모듈이 생기면 아래처럼 분리할 수 있습니다.

```ts
const appEnv = process.env.APP_ENV ?? 'local';

const imports = [
  CustomConfigModule,
  PrismaModule,
  ...(appEnv === 'local' ? [LocalDevModule] : []),
];
```

이렇게 하면 `@Module()` 내부를 계속 수정하지 않고도 환경별 모듈 구성을 관리할 수 있습니다.

## 관리 기준

`imports` 배열에는 앱 전체 구동에 필요한 기반 모듈을 우선 배치합니다.

예시:

- 설정 모듈
- 데이터베이스/ORM 모듈
- 인증/인가 모듈
- 로깅 모듈
- 모니터링 모듈

특정 도메인에서만 사용하는 기능은 해당 도메인 모듈 안에서 import하고,
앱 전체에 영향을 주는 기반 모듈만 `AppModule`의 `imports` 배열에서 관리하는 것이 좋습니다.
