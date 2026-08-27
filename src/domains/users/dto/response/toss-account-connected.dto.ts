/**
 * 토스 계좌 연동 성공 응답.
 *
 * tossApi 필드는 UserInfoResponseDto(GET /users/me)가 쓰는 것과
 * 정확히 같은 모양을 유지한다 — 같은 값을 다른 두 API가 다르게
 * 표현하면 프론트가 헷갈린다.
 */
export class TossAccountConnectedDto {
  /** 사용자 ID.
   * @example 1
   */
  id: number;

  tossApi: {
    /** 토스 API 연동 여부. 이 응답에서는 항상 true.
     * @example true
     */
    connected: boolean;

    /** 토스 API 연동 일시.
     * @example 2026-07-26T09:00:00Z
     */
    connectedAt: string | null;
  };
}
