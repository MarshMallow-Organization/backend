export type DiaryListItem = {
  diaryId: number;
  orderId: number;
  type: 'BUY' | 'SELL';
  date: string;
  corpCode: string;
  corpName: string;
  avgPrice: number | null;
  quantity: number;
  memo: string;
  createdAt: string;
};

export type DiaryPageCriteria = {
  page: number;
  size: number;
  dates?: string[];
  startDate?: string;
  endDate?: string;
  companies?: string[];
  orderBy: readonly [{ date: 'desc' }, { diaryId: 'desc' }];
};

export type DiaryPageResult = {
  items: DiaryListItem[];
  totalElements: number;
};

/**
 * 조회 기술(Prisma 쿼리 등)을 서비스 계층에서 분리하기 위한 포트입니다.
 * 실제 DB 조회는 이 클래스를 구현한 어댑터에 작성합니다.
 */
export abstract class DiariesRepository {
  abstract findPage(
    userId: number,
    criteria: DiaryPageCriteria,
  ): Promise<DiaryPageResult>;
}
