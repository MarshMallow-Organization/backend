import { DiaryType, GoalHoldPeriod } from './diary.model';
import { buildUpdateDiaryCommand } from './update-diary.model';

describe('buildUpdateDiaryCommand', () => {
  const buyDiary = {
    diaryId: 1,
    type: DiaryType.BUY,
    goalHoldPeriod: GoalHoldPeriod.CUSTOM,
    customGoalHoldPeriod: '45일',
  };

  it('BUY 수정 요청을 유형이 명시된 command로 만든다', () => {
    expect(
      buildUpdateDiaryCommand(buyDiary, {
        emotion: 3,
        goalPrice: null,
        memo: null,
      }),
    ).toEqual({
      ok: true,
      command: {
        type: DiaryType.BUY,
        emotion: 3,
        goalPrice: null,
        memo: null,
      },
    });
  });

  it('BUY 일기에 SELL 전용 필드가 있으면 거부한다', () => {
    expect(
      buildUpdateDiaryCommand(buyDiary, {
        sellReasonDetail: '수익 실현',
      }),
    ).toEqual({ ok: false, violation: 'INVALID_DIARY_UPDATE' });
  });

  it('CUSTOM인데 기존 값과 요청 값이 모두 없으면 거부한다', () => {
    expect(
      buildUpdateDiaryCommand(
        { ...buyDiary, customGoalHoldPeriod: null },
        { goalHoldPeriod: GoalHoldPeriod.CUSTOM },
      ),
    ).toEqual({ ok: false, violation: 'INVALID_FIELD_VALUE' });
  });

  it('CUSTOM에서 일반 보유 기간으로 바꾸면 직접 입력값도 삭제한다', () => {
    expect(
      buildUpdateDiaryCommand(buyDiary, {
        goalHoldPeriod: GoalHoldPeriod.MID_TERM,
      }),
    ).toEqual({
      ok: true,
      command: {
        type: DiaryType.BUY,
        goalHoldPeriod: GoalHoldPeriod.MID_TERM,
        customGoalHoldPeriod: null,
      },
    });
  });

  it('SELL 수정 command에는 BUY 필드를 포함하지 않는다', () => {
    expect(
      buildUpdateDiaryCommand(
        { diaryId: 2, type: DiaryType.SELL },
        { emotion: 2, sellReasonDetail: null },
      ),
    ).toEqual({
      ok: true,
      command: {
        type: DiaryType.SELL,
        emotion: 2,
        sellReasonDetail: null,
      },
    });
  });
});
