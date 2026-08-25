# 한국투자증권 (KIS) OpenAPI 연동 명세서

`KisClient`(`src/domains/api/clients/kis/kis.client.ts`)는 한국투자증권(KIS) OpenAPI와의 통신을 전담하는 공통 통신 엔진입니다.
조회 목적의 REST API 및 조건부 주문 목표가(`target_price`) 실시간 감시를 위한 웹소켓 접속키(Approval Key) 관리를 지원합니다.

---

## 1. 주요 특징 및 사양

1. **개발자 키 단일 관리 (`.env`)**:
   - 토스와 달리 사용자별 연동 키가 불필요하며, `.env`에 정의된 `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_ACCESS_TOKEN`, `KIS_APPROVAL_KEY`를 기반으로 동작합니다.
   - `.env`에 `KIS_ACCESS_TOKEN` 또는 `KIS_APPROVAL_KEY`가 설정되어 있으면 네트워크 발급 요청을 생략하고 해당 키를 즉시 재사용합니다.
2. **REST Access Token 자동 관리 및 캐싱**:
   - OAuth 2.0 Client Credentials 방식으로 `POST /oauth2/tokenP`를 호출하여 토큰을 발급받고 메모리에 캐싱합니다 (유효기간: 1일).
   - API 호출 중 토큰이 만료(401 Unauthorized 또는 KIS 토큰 만료 에러 `EGW00121`, `EGW00123`)되면 자동으로 토큰을 재발급받고 1회 재시도합니다.
3. **실시간 웹소켓 접속키 (Approval Key) 발급**:
   - 실시간 체결가 수신을 위해 `POST /oauth2/Approval`을 호출하여 웹소켓 접속키를 발급받고 캐싱합니다.
4. **에러 핸들링 및 표준화**:
   - KIS 응답 코드(`msg_cd`, `error_code`) 및 한글 메시지(`msg1`, `error_description`)를 백엔드 표준 `BusinessException`으로 변환하여 프론트엔드와 CS 로그에 일관되게 전달합니다.

---

## 2. API 지원 범위

### 1) 주식 현재가 시세1 (`inquire-price` / `FHKST01010100`)
단일 종목의 현재 시세 및 핵심 투자 지표를 조회합니다.

- **주요 응답 데이터 (`KisStockPrice1Output`)**:
  - **기본 시세**: 주식 현재가(`stck_prpr`), 전일 대비(`prdy_vrss`), 전일 대비율(`prdy_ctrt`), 시가/고가/저가/상한가/하한가
  - **거래량/거래대금**: 누적 거래량(`acml_vol`), 누적 거래대금(`acml_tr_pbmn`), 거래량 회전율
  - **투자 지표**: `per`, `pbr`, `eps`, `bps`
  - **52주 최고/최저가**: `w52_hgpr`, `w52_lwpr` 및 일자/대비율
  - **수급 및 시장 정보**: HTS 시가총액(`hts_avls`), 상장주수(`lstn_stcn`), HTS 외국인 소진율(`hts_frgn_ehrt`)

### 2) 주식 현재가 시세2 (`inquire-daily-price` / `FHKST01010400`)
과거 일자별 시세(영업일자, 시가, 고가, 저가, 종가, 거래량 등) 추이를 조회합니다.

### 3) 실시간 웹소켓 체결가 (`H0STCNT0`)
- **목적**: 조건부 주문이 걸린 종목의 실시간 틱(Tick) 시세를 감시하여, 현재가가 `target_price`에 도달하면 즉각 체결 주문을 실행하는 용도입니다.
- **접속 URL**: `ws://ops.koreainvestment.com:21000` (`client.getWebSocketUrl()`)
- **접속 키**: `client.getApprovalKey()`를 통해 발급받은 `approval_key` 사용

---

## 3. 사용 예시

### 1) REST API 종목 시세 조회
```typescript
import { Injectable } from '@nestjs/common';
import { KisClient } from 'src/domains/api/clients/kis/kis.client';
import { KisStockPrice1Response } from 'src/domains/api/clients/kis/kis.types';

@Injectable()
export class MarketsService {
  constructor(private readonly kisClient: KisClient) {}

  async getStockPrice(symbol: string) {
    const response = await this.kisClient.request<KisStockPrice1Response>(
      `/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol}`,
      {
        method: 'GET',
        trId: 'FHKST01010100',
      },
    );

    return response.output;
  }
}
```

### 2) 실시간 웹소켓 접속키 발급
```typescript
const approvalKey = await this.kisClient.getApprovalKey();
const wsUrl = this.kisClient.getWebSocketUrl();
// WebSocket 연결 및 구독 등록 (tr_id: 'H0STCNT0', tr_key: symbol)
```

---

## 4. 테스트 가이드

```bash
yarn test src/domains/api/clients/kis/kis.client.spec.ts
```
> [!NOTE]
> KIS 정책상 OAuth 토큰 발급은 **1분당 1회**로 제한됩니다. 테스트를 연속으로 빠르게 여러 번 실행하면 403(`EGW00133`) 에러가 발생할 수 있으니 1분 간격을 두고 실행해 주세요.
