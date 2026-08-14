import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from '../dto/request/post-diaries.dto';

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

export type DiaryOrderSnapshot = {
  orderId: number;
  userId: number;
  type: DiaryType;
  corpCode: string;
  corpName: string;
  perAtTrade: number | null;
  pbrAtTrade: number | null;
  marketCapAtTrade: number | null;
  candelChartAtUrl: string | null;
};

type CommonCreateDiaryCommand = {
  orderId: number;
  date: string;
  emotion: number;
  memo?: string;
  corpCode: string;
  corpName: string;
  perAtTrade: number | null;
  pbrAtTrade: number | null;
  marketCapAtTrade: number | null;
  candelChartAtUrl: string | null;
};

export type CreateDiaryCommand = CommonCreateDiaryCommand &
  (
    | {
        type: DiaryType.BUY;
        buyReason: string;
        goalPrice?: number | null;
        goalHoldPeriod?: GoalHoldPeriod;
        customGoalHoldPeriod?: string;
      }
    | {
        type: DiaryType.SELL;
        sellReasonCode: SellReasonCode;
        sellReasonDetail?: string;
        goalEvaluationCode?: GoalEvaluationCode;
        goalEvaluationDetail?: string;
      }
  );

export type CreateDiaryResult = {
  diaryId: number;
  orderId: number;
  type: DiaryType;
  date: string;
  createdAt: string;
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

  abstract findOrderById(orderId: number): Promise<DiaryOrderSnapshot | null>;

  abstract existsActiveDiary(userId: number, orderId: number): Promise<boolean>;

  abstract createDiary(
    userId: number,
    command: CreateDiaryCommand,
  ): Promise<CreateDiaryResult>;
}
