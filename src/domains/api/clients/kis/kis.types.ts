/**
 * KIS (한국투자증권) Open API 인터페이스 정의
 * - 개발자용 단일 키(.env)를 기반으로 주식 현재가 시세1/2 조회 및 실시간 웹소켓(조건부 주문 감시용) 연동을 지원합니다.
 * - 명명 규칙: 요청은 `Request`, 응답은 `Response`를 반드시 접미사로 붙여 통일합니다.
 */

// ─────────────────────────────────────────────────────────────
// 1. OAuth 토큰 및 웹소켓 Approval Key 인터페이스
// ─────────────────────────────────────────────────────────────

/** KIS OAuth 토큰 발급 요청 */
export interface KisTokenRequest {
  grant_type: string; // 'client_credentials'
  appkey: string;
  appsecret: string;
}

/** KIS OAuth 토큰 발급 응답 */
export interface KisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // 초 단위 유효기간 (기본 86400초)
  access_token_token_expired?: string;
}

/** KIS 실시간 웹소켓 접속키(Approval Key) 발급 요청 */
export interface KisApprovalKeyRequest {
  grant_type: string; // 'client_credentials'
  appkey: string;
  secretkey: string; // KIS 사양상 secretkey 필드명 사용
}

/** KIS 실시간 웹소켓 접속키(Approval Key) 발급 응답 */
export interface KisApprovalKeyResponse {
  approval_key: string;
}

// ─────────────────────────────────────────────────────────────
// 2. 공통 에러 및 요청 옵션 인터페이스
// ─────────────────────────────────────────────────────────────

/** KIS 공통 에러 응답 */
export interface KisErrorResponse {
  rt_cd?: string; // 성공 여부 ('0': 성공, 그 외: 실패)
  msg_cd?: string; // 응답 코드 (예: 'EGW00123')
  msg1?: string; // 응답 한글 메시지 (예: '유효하지 않은 토큰입니다.')
  error_code?: string; // OAuth 에러 코드 (예: 'EGW00133')
  error_description?: string; // OAuth 에러 메시지
}

/** KIS REST API 공통 요청 옵션 */
export interface KisApiRequestOptions extends RequestInit {
  trId?: string; // 거래 ID (예: 주식현재가 시세1 'FHKST01010100', 시세2 'FHKST01010400')
  trCont?: string; // 연속조회 여부 (' ' 또는 'N')
  custtype?: 'P' | 'B'; // 고객타입 ('P': 개인, 'B': 법인, 기본값: 'P')
}

// ─────────────────────────────────────────────────────────────
// 3. 주식 현재가 시세1 (inquire-price / FHKST01010100)
// ─────────────────────────────────────────────────────────────

/** 주식 현재가 시세1 출력부 */
export interface KisStockPrice1Output {
  // ─── 가격 정보 ───
  stck_prpr?: string; // 주식 현재가
  prdy_vrss?: string; // 전일 대비
  prdy_vrss_sign?: string; // 전일 대비 부호 (1: 상한, 2: 상승, 3: 보합, 4: 하한, 5: 하락)
  prdy_ctrt?: string; // 전일 대비율
  stck_oprc?: string; // 시가
  stck_hgpr?: string; // 고가
  stck_lwpr?: string; // 저가
  stck_mxpr?: string; // 상한가
  stck_llam?: string; // 하한가
  stck_sdpr?: string; // 기준가 (전일 종가)
  wghn_avrg_stck_prc?: string; // 가중 평균 주식 가격

  // ─── 거래량 및 거래대금 ───
  acml_vol?: string; // 누적 거래량
  acml_tr_pbmn?: string; // 누적 거래 대금
  prdy_vrss_vol_rate?: string; // 전일 대비 거래량 비율
  vol_tnrt?: string; // 거래량 회전율

  // ─── 투자 지표 ───
  per?: string; // PER (주가수익비율)
  pbr?: string; // PBR (주가순자산비율)
  eps?: string; // EPS (주당순이익)
  bps?: string; // BPS (주당순자산가치)

  // ─── 52주 최고/최저가 ───
  w52_hgpr?: string; // 52주일 최고가
  w52_hgpr_date?: string; // 52주일 최고가 일자
  w52_hgpr_vrss_prpr_ctrt?: string; // 52주일 최고가 대비 현재가 대비율
  w52_lwpr?: string; // 52주일 최저가
  w52_lwpr_date?: string; // 52주일 최저가 일자
  w52_lwpr_vrss_prpr_ctrt?: string; // 52주일 최저가 대비 현재가 대비율

  // ─── 종목 및 시장 정보 ───
  stck_shrn_iscd?: string; // 주식 단축 종목코드 (예: '005930')
  rprs_mrkt_kor_name?: string; // 대표 시장 한글 명 (KOSPI, KOSDAQ 등)
  bstp_kor_isnm?: string; // 업종 한글 종목명
  hts_avls?: string; // HTS 시가총액 (억원 단위)
  lstn_stcn?: string; // 상장 주수
  cpfn?: string; // 자본금
  fcam_cnnm?: string; // 액면가 통화명

  // ─── 수급 및 기타 ───
  hts_frgn_ehrt?: string; // HTS 외국인 소진율
  frgn_ntby_qty?: string; // 외국인 순매수 수량
  pgtr_ntby_qty?: string; // 프로그램 순매수 수량
  iscd_stat_cls_code?: string; // 종목 상태 구분 코드
  marg_rate?: string; // 증거금 비율
  crdt_able_yn?: string; // 신용 가능 여부
  ssts_yn?: string; // 공매도 가능 여부

  [key: string]: unknown;
}

/** 주식 현재가 시세1 조회 응답 */
export interface KisStockPrice1Response {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output?: KisStockPrice1Output;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// 4. 주식 현재가 시세2 (inquire-daily-price / FHKST01010400)
// ─────────────────────────────────────────────────────────────

/** 주식 현재가 시세2 일별 시세 항목 */
export interface KisStockPrice2DailyItem {
  stck_bsop_date?: string; // 주식 영업 일자 (YYYYMMDD)
  stck_clpr?: string; // 주식 종가
  stck_oprc?: string; // 주식 시가
  stck_hgpr?: string; // 주식 고가
  stck_lwpr?: string; // 주식 저가
  acml_vol?: string; // 누적 거래량
  acml_tr_pbmn?: string; // 누적 거래 대금
  prdy_vrss?: string; // 전일 대비
  prdy_vrss_sign?: string; // 전일 대비 부호
  [key: string]: unknown;
}

/** 주식 현재가 시세2 조회 응답 */
export interface KisStockPrice2Response {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1?: KisStockPrice1Output;
  output2?: KisStockPrice2DailyItem[];
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// 5. 실시간 웹소켓 요청 및 실시간 체결가 응답 (조건부 주문 감시용)
// ─────────────────────────────────────────────────────────────

/** 실시간 웹소켓 요청 헤더 */
export interface KisRealtimePriceWebSocketRequestHeader {
  approval_key: string;
  custtype?: 'P' | 'B';
  tr_type: '1' | '2'; // '1': 등록, '2': 해제
  'content-type': 'utf-8';
}

/** 실시간 웹소켓 요청 본문 */
export interface KisRealtimePriceWebSocketRequestBody {
  input: {
    tr_id: string; // 실시간 거래 ID ('H0STCNT0': 국내주식 실시간 체결가)
    tr_key: string; // 종목코드 (예: '005930')
  };
}

/** 실시간 웹소켓 요청 */
export interface KisRealtimePriceWebSocketRequest {
  header: KisRealtimePriceWebSocketRequestHeader;
  body: KisRealtimePriceWebSocketRequestBody;
}

/**
 * 실시간 체결가 웹소켓 수신 데이터 파싱 응답
 * (조건부 주문 target_price 실시간 감시 및 체결 비교용)
 */
export interface KisRealtimePriceResponse {
  symbol: string; // 종목코드 (예: '005930')
  time: string; // 체결시간 (HHMMSS)
  currentPrice: number; // 현재가 (target_price 도달 여부 비교용)
  sign: string; // 전일 대비 부호 (1: 상한, 2: 상승, 3: 보합, 4: 하한, 5: 하락)
  change: number; // 전일 대비 금액
  changeRate: number; // 전일 대비율 (%)
  openPrice: number; // 시가
  highPrice: number; // 고가
  lowPrice: number; // 저가
  volume: number; // 체결 거래량
  accumulatedVolume: number; // 누적 거래량
  accumulatedAmount: number; // 누적 거래대금
}
