# Diaries Prisma Repository DB 연동 계획

## 1. 목적

현재 `DiariesRepository` 추상 포트와 `DiariesRepositoryStub`을 실제 Prisma 구현체로 교체한다.

이번 작업의 원칙은 다음과 같다.

- 기존 Prisma 스키마와 마이그레이션은 가능한 한 변경하지 않는다.
- 소유권 검사는 모든 조회와 쓰기 쿼리에 포함한다.
- 여러 테이블을 다루거나 선행 조회 결과에 따라 쓰는 작업은 트랜잭션으로 처리한다.
- Prisma의 `Decimal`, `DateTime`, enum 타입이 서비스 계층으로 새지 않게 Repository에서 변환한다.
- BUY와 SELL의 서로 다른 필드를 명시적으로 매핑한다.
- 서비스의 사전 검사는 빠른 실패를 위한 것이며, 쓰기 직전 Repository 트랜잭션에서 조건을 다시 검증한다.
- 차트 이미지 필드는 향후 S3 연동을 위해 nullable 계약을 유지하되, 이번 구현에서는 조회·저장하지 않고 항상 `null`을 반환한다.

## 2. 구현 파일 구조

예상 파일 구성은 다음과 같다.

```text
src/domains/diaries/
├── diaries.module.ts
└── repositories/
    ├── diaries.repository.ts
    ├── prisma-diaries.repository.ts
    ├── prisma-diaries.repository.spec.ts
    └── diary-record.mapper.ts           # 매핑이 커질 때만 분리
```

`PrismaDiariesRepository`는 `DiariesRepository`를 상속하고 `PrismaService`를 주입받는다. 초기에는 구현체 한 파일로 시작하고, 매핑 코드가 커질 때만 mapper 파일을 분리한다.

## 3. 공통 매핑 규칙

### 숫자

- Prisma `Decimal | null`은 `number | null`로 변환한다.
- 가격, 손익, 비율, 시가총액은 Repository 반환 직전에 변환한다.
- DB 저장 시에는 DTO의 `number`를 Prisma가 받을 수 있는 값으로 전달한다.

JavaScript `number`는 매우 큰 시가총액에서 정밀도 손실 가능성이 있다. 현재 API 계약이 `number`이므로 이번 작업에서는 계약을 유지하되, 정밀도 경계값을 테스트한다.

### 날짜

- `Diary.date`는 `YYYY-MM-DD` 문자열과 UTC 자정 `Date` 사이에서 변환한다.
- 응답의 `createdAt`, `updatedAt`, `deletedAt`, `orderedAt`은 ISO 8601 문자열로 반환한다.
- `@db.Date` 필터는 날짜 경계가 타임존에 따라 이동하지 않도록 공통 변환 함수를 사용한다.

### 필드명 매핑

PER/PBR/시가총액은 API와 DB 모두 주문 시점이라는 의미가 드러나도록 `AtOrder`로 통일한다.

| API/도메인 필드 | DB 원본 |
|---|---|
| `perAtOrder` | `Diary.perAtOrder` 또는 `Order.perAtOrder` |
| `pbrAtOrder` | `Diary.pbrAtOrder` 또는 `Order.pbrAtOrder` |
| `marketCapAtOrder` | `Diary.marketCapAtOrder` 또는 `Order.marketCapAtOrder` |

`candleChartAtUrl`, `candleChartAtOrderUrl`은 `string | null` 계약을 유지한다. 이번 Repository 구현에서는 `Snapshot -> Image` 관계를 조회하거나 DB에 URL을 저장하지 않고 항상 `null`로 매핑한다. 추후 차트 스냅샷 기능을 구현할 때 S3 URL을 반환하도록 교체한다.

### 체결 요약

한 주문에 여러 `Trade`가 있으면 다음 값을 공통 helper에서 계산한다.

```text
quantity    = sum(trade.quantity)
totalAmount = sum(trade.price * trade.quantity)
avgPrice    = totalAmount / quantity
```

- 체결이 하나라도 있으면 체결 데이터만 사용한다.
- 체결이 없으면 `Order.price`, `Order.quantity`, `Order.price * Order.quantity`로 대체한다.
- 주문 가격이 `null`이면 평균 가격과 총액도 `null`이다.

## 4. Repository 메서드별 구현안

### `findPrefillByOrderId(userId, orderId)`

- `Order`를 반드시 `{ id: orderId, userId }`로 조회한다.
- `trades`를 함께 조회한다.
- 주문이 없거나 타인 소유이면 `null`을 반환한다.
- 체결 요약으로 `price`와 `quantity`를 계산한다.
- `orderedAt`은 `Order.createdAt`을 사용한다.
- SELL의 `buyPrice`는 회사별 매수 평단 정책이 없으므로 우선 `null`을 반환한다.
- SELL의 `realizedProfit`은 체결별 non-null 값을 합산한다.
- SELL의 `returnRate`는 non-null 체결만 수량 가중평균하는 방식을 기본안으로 한다.
- PER/PBR/시가총액은 주문 시점 스냅샷에서 읽는다.
- `candleChartAtUrl`은 `null`을 반환한다.

### `findDetailById(userId, diaryId)`

- `{ id: diaryId, userId, deletedAt: null }` 조건으로 조회한다.
- `buyDiary`, `sellDiary`, `order.trades`를 함께 조회한다.
- BUY/SELL 유형에 맞는 하위 레코드가 없으면 데이터 무결성 오류로 처리한다.
- BUY 응답의 `price`, `quantity`, `totalAmount`는 체결 요약을 사용한다.
- SELL 응답의 `sellPrice`, `totalSellAmount`도 체결 요약을 사용한다.
- SELL의 `averagePrice`와 `totalBuyAmount`는 매수 평단 정책 확정 전까지 `null`로 둔다.
- 일기 작성 시 저장된 PER/PBR/시가총액은 `Diary` 값을 사용한다.
- `candleChartAtUrl`은 `null`을 반환한다.

### `findPage(userId, criteria)`

- 기본 조건은 `{ userId, deletedAt: null }`이다.
- `dates`는 `date in (...)`, 기간은 `date >= startDate AND date <= endDate`로 변환한다.
- `companies`는 현재 DTO 설명에 맞춰 `corpCode in (...)`으로 처리한다.
- `skip = page * size`, `take = size`를 적용한다.
- 정렬은 항상 `date DESC`, `id DESC`로 적용한다. 도메인의 `diaryId`는 Prisma 필드 `id`로 매핑한다.
- `findMany`와 `count`는 Prisma 배열 트랜잭션으로 묶어 같은 조회 시점의 페이지와 개수를 반환한다.
- 목록 크기가 최대 20이므로 `order.trades`와 BUY/SELL 하위 레코드를 include한 뒤 체결 요약과 `memo`를 매핑한다.
- N+1 쿼리가 발생하지 않도록 항목별 추가 조회는 하지 않는다.

### `findOrderById(orderId)`

- 주문의 소유권, 유형, 종목 정보와 PER/PBR/시가총액을 조회해 `DiaryOrderSnapshot`으로 변환한다.
- 이미지 관계는 조회하지 않고 `candleChartAtOrderUrl`은 `null`로 반환한다.
- 이 메서드는 현재 서비스의 소유권 은닉 검사를 위해 `userId`도 반환한다.
- 최종 생성 트랜잭션에서도 소유권과 주문 유형을 다시 확인한다.

### `existsActiveDiary(userId, orderId)`

- `{ userId, orderId, deletedAt: null }` 조건의 `count` 또는 `findFirst`를 사용한다.
- 서비스의 빠른 중복 응답을 위한 보조 검사다.
- 동시 요청에 대한 최종 보장은 `createDiary` 트랜잭션이 담당한다.

### `createDiary(userId, command)`

하나의 interactive transaction 안에서 다음 순서로 처리한다.

1. 대상 `Order` 행을 잠그고 다시 조회한다.
2. 주문 소유권과 `command.type` 일치 여부를 다시 검증한다.
3. `{ userId, orderId, deletedAt: null }` 활성 일기를 다시 조회한다.
4. 공통 `Diary`와 유형별 `BuyDiary` 또는 `SellDiary`를 nested create한다.
5. 생성 결과를 `CreateDiaryResponseDto`로 매핑한다.

`command.candleChartAtOrderUrl`은 이번 구현에서 항상 `null`이며 DB에 저장하지 않는다.

스키마에 활성 일기용 부분 유니크 인덱스를 추가하지 않는 대신, 같은 `orderId`의 생성 요청을 직렬화한다.

- 권장안: 트랜잭션 안에서 parameterized `$queryRaw`의 `SELECT ... FOR UPDATE`로 대상 `orders` 행을 잠근다.
- `$queryRawUnsafe`와 문자열 조합 SQL은 사용하지 않는다.
- 잠금 뒤 Prisma로 주문과 활성 일기를 다시 읽는다.
- 서비스 밖 또는 다른 코드 경로가 동일 규칙을 우회하지 않도록 일기 생성은 이 Repository 메서드만 사용한다.

이 방식은 DB 스키마 변경 없이 현재 애플리케이션 경로의 중복 생성을 막는다. 다만 DB 자체의 유일성 제약은 아니므로, 별도 SQL이나 다른 애플리케이션이 직접 `diaries`에 INSERT하면 중복을 막지 못한다.

### `findActiveDiaryForUpdate(userId, diaryId)`

- `{ id: diaryId, userId, deletedAt: null }`로 조회한다.
- BUY일 때만 `goalHoldPeriod`, `customGoalHoldPeriod`를 포함한다.
- 타인 소유, 삭제됨, 미존재는 모두 `null`로 숨긴다.

### `updateDiary(userId, diaryId, command)`

하나의 interactive transaction 안에서 다음 순서로 처리한다.

1. `{ id: diaryId, userId }` 조건으로 대상 `Diary` 행을 잠그고 `deletedAt: null`과 유형을 다시 검증한다.
2. 조회한 DB 유형과 `command.type`이 같은지 확인한다.
3. `Diary.date` 등 공통 필드를 갱신한다.
4. 유형에 맞는 `BuyDiary` 또는 `SellDiary` 필드만 갱신한다.
5. 같은 트랜잭션 안에서 `order.trades`까지 다시 읽는다.
6. 체결 요약과 최신 일기 값을 `UpdatedDiaryResult`로 매핑한다.

서비스의 `findActiveDiaryForUpdate` 이후 삭제가 일어나는 TOCTOU 상황을 막기 위해 트랜잭션 시작 시 parameterized `$queryRaw`의 `SELECT ... FOR UPDATE`로 공통 `Diary` 행을 잠근다. 하위 테이블이 없거나 유형이 다르면 부분 갱신하지 않고 전체 롤백한다.

### `softDeleteDiary(userId, diaryId)`

하나의 interactive transaction 안에서 다음 순서로 처리한다.

1. `{ id: diaryId, userId }` 조건으로 대상 `Diary` 행을 `SELECT ... FOR UPDATE`하여 잠근 뒤 삭제 여부와 관계없이 조회한다.
2. 없거나 타인 소유이면 `null`을 반환한다.
3. 이미 `deletedAt`이 있으면 기존 시각을 그대로 반환한다.
4. 활성 상태면 현재 시각을 `deletedAt`에 기록한다.

BUY/SELL 하위 행과 원주문은 삭제하지 않는다.

## 5. 트랜잭션 정책

| 작업 | 방식 | 이유 |
|---|---|---|
| 목록 + 전체 개수 | 배열 트랜잭션 | 페이지 데이터와 개수의 일관성 |
| 일기 생성 | interactive transaction + 주문 행 잠금 | 중복 검사와 BUY/SELL 생성의 원자성 |
| 일기 수정 | interactive transaction + 일기 행 잠금 | 활성 상태 재검사와 두 테이블 수정의 원자성 |
| soft delete | interactive transaction + 일기 행 잠금 | 최초 삭제 시각 보존과 재요청 멱등성 |
| 단순 단건 조회 | 단일 Prisma 쿼리 | 추가 트랜잭션 이점 없음 |

교착 상태나 write conflict가 발생할 수 있으므로 Prisma의 재시도 가능한 트랜잭션 오류만 짧게 제한 재시도한다. 비즈니스 예외, 검증 오류, 알 수 없는 DB 오류는 재시도하지 않는다. 재시도 횟수와 대상 오류 코드는 테스트로 고정한다.

## 6. DI 연결

`diaries.module.ts`에서 다음 작업을 수행한다.

1. `DiariesRepositoryStub`을 제거한다.
2. `PrismaModule`을 imports에 등록한다.
3. `{ provide: DiariesRepository, useClass: PrismaDiariesRepository }`로 교체한다.

Controller와 Service의 생성자 계약은 변경하지 않는다.

## 7. 테스트 계획

### 매핑 단위 테스트

- Prisma Decimal과 nullable 값 변환
- `YYYY-MM-DD`와 `Date` 변환
- 체결 0건 fallback
- 체결 1건과 분할 체결의 수량 가중평균
- BUY/SELL별 memo와 상세 필드 매핑
- SELL realizedProfit 합계와 returnRate 가중평균
- 차트 이미지 필드가 항상 `null`로 매핑됨

### Repository DB 연동 테스트

- 타 사용자 주문과 일기를 조회할 수 없음
- soft delete된 일기가 목록, 상세, 수정 조회에서 제외됨
- 날짜 목록/기간/회사 필터와 `date DESC, id DESC` 정렬
- `findMany` 결과와 `totalElements` 일치
- BUY 생성 시 `Diary`와 `BuyDiary`가 함께 생성됨
- SELL 생성 시 `Diary`와 `SellDiary`가 함께 생성됨
- 하위 테이블 쓰기 실패 시 공통 Diary도 롤백됨
- 수정 실패 시 공통/유형별 변경이 모두 롤백됨
- 최초 삭제와 반복 삭제가 같은 `deletedAt`을 반환함
- 동시에 같은 주문으로 두 번 생성하면 하나만 성공함
- 삭제된 기존 일기가 있으면 새 활성 일기를 만들 수 있음

### 회귀 검증

```bash
yarn test --runInBand
yarn build
yarn lint
```

실제 MariaDB를 사용하는 Repository 통합 테스트와 Diaries E2E 테스트를 추가해 Prisma mock만으로는 확인할 수 없는 잠금과 트랜잭션 동작을 검증한다.

## 8. 구현 순서

1. 공통 날짜/Decimal/체결 요약 mapper와 단위 테스트 작성
2. 단순 조회 메서드 구현
3. 목록 필터와 페이지 조회 구현
4. 생성 트랜잭션과 주문 행 잠금 구현
5. 수정 트랜잭션 구현
6. 멱등 soft delete 트랜잭션 구현
7. Module의 Stub을 실제 구현체로 교체
8. MariaDB 통합 테스트와 E2E 테스트 추가
9. 전체 테스트, build, lint 실행

## 9. 구현 전 확인할 계약

아래 항목은 스키마 변경 없이 구현할 수 있지만 API 의미를 명확히 할 필요가 있다.

1. `UpdatedDiaryResult.price`와 `totalAmount`는 미체결 시장가 주문의 `Order.price === null`을 표현할 수 있도록 `number | null` 계약을 사용한다.
2. SELL의 `buyPrice`, `averagePrice`, `totalBuyAmount`를 계산할 회사별 매수 평단 정책이 아직 없다. 이번 구현에서는 `null` 유지가 안전하다.
3. 여러 SELL 체결의 `returnRate`는 수량 가중평균을 기본안으로 적었지만, 서버에서 전체 손익률을 재계산할지 제품 정책 확인이 필요하다.
4. API의 PER/PBR/시가총액 필드명은 실제 의미에 맞게 `perAtOrder`, `pbrAtOrder`, `marketCapAtOrder`로 통일한다.
5. 차트 이미지 관련 필드는 nullable로 유지하고 이번 구현에서는 항상 `null`을 반환한다. 추후 S3 기반 차트 스냅샷 기능에서 실제 URL을 연결한다.

## 10. 완료 기준

- `DiariesRepositoryStub` 없이 애플리케이션이 시작된다.
- Repository의 9개 메서드가 실제 DB와 연결된다.
- 생성, 수정, soft delete가 각각 정의된 트랜잭션 경계에서 원자적으로 동작한다.
- 같은 주문에 대한 동시 생성 테스트에서 활성 일기는 하나만 남는다.
- 소유권과 `deletedAt` 조건이 모든 관련 쿼리에 적용된다.
- Prisma 타입 변환과 BUY/SELL 응답 매핑 테스트가 통과한다.
- Diaries 관련 테스트, 전체 build와 lint가 통과한다.
