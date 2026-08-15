import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from '../dto/request/post-diaries.dto';

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
