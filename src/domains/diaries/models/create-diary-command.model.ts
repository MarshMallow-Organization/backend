import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from './diary.model';

type CommonCreateDiaryCommand = {
  orderId: number;
  date: string;
  emotion: number;
  memo?: string;
  corpCode: string;
  corpName: string;
  perAtOrder: number | null;
  pbrAtOrder: number | null;
  marketCapAtOrder: number | null;
  candleChartAtOrderUrl: string | null;
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
