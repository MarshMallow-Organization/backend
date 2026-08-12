import { Prisma } from 'src/generated/prisma/client';

/** 서비스 코드에서 자주 분기하는 Prisma 에러 코드. */
export const PrismaErrorCode = {
  /** 유니크 제약 위반 */
  UNIQUE_CONSTRAINT: 'P2002',

  /** update/delete 대상 레코드가 없음 */
  RECORD_NOT_FOUND: 'P2025',

  /** 외래 키 제약 위반 */
  FOREIGN_KEY_CONSTRAINT: 'P2003',
} as const;

export type PrismaErrorCodeValue =
  (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode];

/**
 * Prisma known request 에러인지, 그리고 특정 코드인지 판별한다.
 *
 * PrismaExceptionFilter도 같은 에러를 처리하지만 도메인을 모르기 때문에
 * '이미 존재하는 값입니다.' 같은 일반적인 문구밖에 내려줄 수 없다.
 * 명세서가 요구하는 구체적인 문구가 있다면 서비스에서 이 헬퍼로 분기해
 * 도메인 BusinessException으로 바꿔 던진다. 잡지 않은 에러는 그대로
 * 필터까지 흘러가 안전망으로 처리된다.
 *
 * @example
 * try {
 *   return await this.prisma.virtualPortfolio.create({ data });
 * } catch (error) {
 *   if (isPrismaError(error, PrismaErrorCode.UNIQUE_CONSTRAINT)) {
 *     throw new BusinessException(AssetsErrorCode.PORTFOLIO_NAME_DUPLICATED, {
 *       userId,
 *       name: data.name,
 *     });
 *   }
 *   throw error;
 * }
 */
export const isPrismaError = (
  error: unknown,
  code: PrismaErrorCodeValue,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
