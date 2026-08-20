/** 가상계좌 기본 정보. 목록·생성 응답이 공유한다. */
export class PortfolioSummaryDto {
  /** 가상계좌 ID.
   * @example 12
   */
  id: number;

  /** 가상계좌 이름. 사용자 내에서 유일하다.
   * @example "안전형 투자"
   */
  name: string;

  /**
   * 정렬 순서 (0-base).
   *
   * 값 자체는 의미가 없고 대소 관계만 보장한다. 삭제 후 생성을 반복하면
   * 0, 1, 2, 7처럼 구멍이 생길 수 있으나 ORDER BY sortOrder, id는 정상
   * 동작한다. 프론트는 배열 순서를 쓰고 이 값을 인덱스로 쓰지 않는다.
   *
   * @example 0
   */
  sortOrder: number;

  /** ISO 8601. Prisma의 Date를 서비스에서 문자열로 변환해 담는다.
   * @example 2026-07-23T09:00:00.000Z
   */
  createdAt: string;
}
