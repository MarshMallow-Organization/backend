# Service

## getDiaries

`DiariesService.getDiaries(userId, query)`는 사용자별 매매 일기 목록을 필터링하고 페이지 단위로 조회하는 서비스 로직이다.

### 입력값

- `userId`: 조회 대상 사용자 ID
- `query.page`: 페이지 번호. 생략하면 `0`
- `query.size`: 한 페이지의 항목 수. 생략하면 `10`, 최대 `20`
- `query.dates`: 조회할 특정 날짜 목록
- `query.startDate`, `query.endDate`: 조회 기간의 시작일과 종료일
- `query.companies`: 조회할 종목 코드 목록

### 처리 순서

1. `page`와 `size`에 기본값을 적용한다.
2. 페이지네이션 값과 날짜 필터를 검증한다.
3. 전달된 필터만 `DiaryPageCriteria`에 포함한다.
4. 정렬 조건을 `date DESC`, `diaryId DESC` 순서로 지정한다.
5. `diariesRepository.findPage(userId, criteria)`를 호출한다.
6. Repository가 반환한 전체 항목 수로 페이지 정보를 계산해 응답한다.

### 검증 규칙

페이지네이션 조건이 다음 중 하나에 해당하면 `INVALID_QUERY_PARAMETER` 예외를 발생시킨다.

- `page`가 정수가 아니거나 `0`보다 작은 경우
- `size`가 정수가 아닌 경우
- `size`가 `1`보다 작거나 `20`보다 큰 경우

날짜 조건이 다음 중 하나에 해당하면 `INVALID_DATE_RANGE` 예외를 발생시킨다.

- `startDate`와 `endDate` 중 하나만 전달한 경우
- `dates`와 기간 조건을 함께 전달한 경우
- `startDate`가 `endDate`보다 늦은 경우

`dates` 또는 `startDate`/`endDate` 중 한 방식만 사용할 수 있다.

### Repository 조회 조건

서비스가 Repository에 전달하는 조건은 다음 형태다.

```ts
{
  page,
  size,
  dates?,
  startDate?,
  endDate?,
  companies?,
  orderBy: [{ date: 'desc' }, { diaryId: 'desc' }],
}
```

필터 값이 `undefined`이면 해당 속성은 조회 조건에서 제외된다. 현재 `DiariesRepository`는 조회 기술을 서비스에서 분리하기 위한 추상 포트이며, 실제 Prisma 등의 DB 조회 구현은 작성되어 있지 않다.

### 응답값

```ts
{
  items,
  page,
  size,
  totalElements,
  totalPages,
  hasNext,
}
```

- `items`: 조회된 일기 목록
- `totalElements`: 필터 조건에 해당하는 전체 일기 수
- `totalPages`: `Math.ceil(totalElements / size)`로 계산한 전체 페이지 수
- `hasNext`: 다음 페이지가 있으면 `true`

조회 결과가 없으면 `items`는 빈 배열, `totalElements`와 `totalPages`는 `0`, `hasNext`는 `false`가 된다.

각 일기 항목은 `diaryId`, `orderId`, 매수·매도 구분인 `type`, 거래일인 `date`, 종목 코드와 이름, 평균 가격, 수량, 메모, 생성 시각을 포함한다.
