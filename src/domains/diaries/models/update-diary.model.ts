import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from './diary.model';

export type DiaryUpdateSnapshot = {
  diaryId: number;
  type: DiaryType;
  goalHoldPeriod?: GoalHoldPeriod | null;
  customGoalHoldPeriod?: string | null;
};

/** HTTP DTO와 무관한 일기 수정 입력값. undefined는 유지, null은 삭제를 뜻한다. */
export type DiaryUpdatePatch = {
  date?: string;
  emotion?: number;
  memo?: string | null;
  buyReason?: string;
  goalPrice?: number | null;
  goalHoldPeriod?: GoalHoldPeriod | null;
  customGoalHoldPeriod?: string | null;
  sellReasonCode?: SellReasonCode;
  sellReasonDetail?: string | null;
  goalEvaluationCode?: GoalEvaluationCode | null;
  goalEvaluationDetail?: string | null;
};

type CommonUpdateDiaryCommand = Pick<
  DiaryUpdatePatch,
  'date' | 'emotion' | 'memo'
>;

export type UpdateDiaryCommand =
  | (CommonUpdateDiaryCommand & {
      type: DiaryType.BUY;
      buyReason?: string;
      goalPrice?: number | null;
      goalHoldPeriod?: GoalHoldPeriod | null;
      customGoalHoldPeriod?: string | null;
    })
  | (CommonUpdateDiaryCommand & {
      type: DiaryType.SELL;
      sellReasonCode?: SellReasonCode;
      sellReasonDetail?: string | null;
      goalEvaluationCode?: GoalEvaluationCode | null;
      goalEvaluationDetail?: string | null;
    });

export type UpdateDiaryViolation =
  'INVALID_DIARY_UPDATE' | 'INVALID_FIELD_VALUE';

export type BuildUpdateDiaryCommandResult =
  | { ok: true; command: UpdateDiaryCommand }
  | { ok: false; violation: UpdateDiaryViolation };

export type UpdatedDiaryResult = {
  diaryId: number;
  orderId: number;
  type: DiaryType;
  price: number;
  quantity: number;
  totalAmount: number;
  date: string;
  emotion: number;
  buyReason?: string;
  goalPrice?: number | null;
  goalHoldPeriod?: GoalHoldPeriod | null;
  customGoalHoldPeriod?: string | null;
  sellReasonCode?: SellReasonCode;
  sellReasonDetail?: string | null;
  goalEvaluationCode?: GoalEvaluationCode | null;
  goalEvaluationDetail?: string | null;
  memo?: string | null;
  updatedAt: string;
};

const BUY_FIELDS = [
  'buyReason',
  'goalPrice',
  'goalHoldPeriod',
  'customGoalHoldPeriod',
] as const satisfies readonly (keyof DiaryUpdatePatch)[];

const SELL_FIELDS = [
  'sellReasonCode',
  'sellReasonDetail',
  'goalEvaluationCode',
  'goalEvaluationDetail',
] as const satisfies readonly (keyof DiaryUpdatePatch)[];

const hasAnyField = (
  patch: DiaryUpdatePatch,
  fields: readonly (keyof DiaryUpdatePatch)[],
): boolean => fields.some((field) => patch[field] !== undefined);

const commonFields = (patch: DiaryUpdatePatch): CommonUpdateDiaryCommand => ({
  ...(patch.date !== undefined && { date: patch.date }),
  ...(patch.emotion !== undefined && { emotion: patch.emotion }),
  ...(patch.memo !== undefined && { memo: patch.memo }),
});

const buildSellUpdateCommand = (
  patch: DiaryUpdatePatch,
): BuildUpdateDiaryCommandResult => {
  if (hasAnyField(patch, BUY_FIELDS)) {
    return { ok: false, violation: 'INVALID_DIARY_UPDATE' };
  }

  return {
    ok: true,
    command: {
      type: DiaryType.SELL,
      ...commonFields(patch),
      ...(patch.sellReasonCode !== undefined && {
        sellReasonCode: patch.sellReasonCode,
      }),
      ...(patch.sellReasonDetail !== undefined && {
        sellReasonDetail: patch.sellReasonDetail,
      }),
      ...(patch.goalEvaluationCode !== undefined && {
        goalEvaluationCode: patch.goalEvaluationCode,
      }),
      ...(patch.goalEvaluationDetail !== undefined && {
        goalEvaluationDetail: patch.goalEvaluationDetail,
      }),
    },
  };
};

const buildBuyUpdateCommand = (
  diary: DiaryUpdateSnapshot,
  patch: DiaryUpdatePatch,
): BuildUpdateDiaryCommandResult => {
  if (hasAnyField(patch, SELL_FIELDS)) {
    return { ok: false, violation: 'INVALID_DIARY_UPDATE' };
  }

  const goalHoldPeriod =
    patch.goalHoldPeriod !== undefined
      ? patch.goalHoldPeriod
      : diary.goalHoldPeriod;
  const customGoalHoldPeriod =
    patch.customGoalHoldPeriod !== undefined
      ? patch.customGoalHoldPeriod
      : diary.customGoalHoldPeriod;

  if (goalHoldPeriod === GoalHoldPeriod.CUSTOM && !customGoalHoldPeriod) {
    return { ok: false, violation: 'INVALID_FIELD_VALUE' };
  }

  if (
    goalHoldPeriod !== GoalHoldPeriod.CUSTOM &&
    patch.customGoalHoldPeriod != null
  ) {
    return { ok: false, violation: 'INVALID_FIELD_VALUE' };
  }

  const clearsCustomGoalHoldPeriod =
    patch.goalHoldPeriod !== undefined &&
    patch.goalHoldPeriod !== GoalHoldPeriod.CUSTOM;

  return {
    ok: true,
    command: {
      type: DiaryType.BUY,
      ...commonFields(patch),
      ...(patch.buyReason !== undefined && { buyReason: patch.buyReason }),
      ...(patch.goalPrice !== undefined && { goalPrice: patch.goalPrice }),
      ...(patch.goalHoldPeriod !== undefined && {
        goalHoldPeriod: patch.goalHoldPeriod,
      }),
      ...(patch.customGoalHoldPeriod !== undefined && {
        customGoalHoldPeriod: patch.customGoalHoldPeriod,
      }),
      ...(clearsCustomGoalHoldPeriod && { customGoalHoldPeriod: null }),
    },
  };
};

/** 기존 일기 상태와 PATCH 입력을 검증하고 유형이 명확한 저장 Command로 변환한다. */
export const buildUpdateDiaryCommand = (
  diary: DiaryUpdateSnapshot,
  patch: DiaryUpdatePatch,
): BuildUpdateDiaryCommandResult =>
  diary.type === DiaryType.BUY
    ? buildBuyUpdateCommand(diary, patch)
    : buildSellUpdateCommand(patch);
