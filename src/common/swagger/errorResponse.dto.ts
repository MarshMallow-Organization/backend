import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 모든 실패 응답의 공통 본문.
 *
 * AllExceptionsFilter·BusinessExceptionFilter·PrismaExceptionFilter가 모두
 * 이 형태로 내보낸다. 성공 응답만 ResponseInterceptor가 `{ data }`로 감싸고
 * 실패 응답은 필터가 직접 res.json()을 호출하므로 감싸이지 않는다.
 * 따라서 이 스키마는 응답 본문 최상위 그대로다.
 *
 * 문서 전용 클래스라 런타임에 인스턴스가 만들어지지는 않는다. 필터가 만드는
 * 객체와 형태가 어긋나지 않도록, 필터를 고칠 때 이 파일도 함께 본다.
 */
export class ErrorResponseDto {
  /**
   * 에러 코드. 프론트가 분기 기준으로 쓴다.
   *
   * BusinessException은 도메인 카탈로그의 코드(FAVORITE_STOCK_NOT_FOUND 등)를,
   * 그 외 HttpException은 HTTP 상태 이름(BAD_REQUEST 등)을 담는다.
   */
  @ApiProperty({
    description:
      '에러 코드. 도메인 코드(FAVORITE_STOCK_NOT_FOUND 등) 또는 HTTP 상태 이름(BAD_REQUEST 등)이 들어간다.',
    example: 'FAVORITE_STOCK_NOT_FOUND',
  })
  code: string;

  /** 사용자 노출용 메시지. 내부 구현 정보는 담기지 않는다. */
  @ApiProperty({
    description: '사용자에게 그대로 보여줄 수 있는 메시지.',
    example: '등록된 관심종목이 아닙니다.',
  })
  message: string;

  /**
   * 요청 추적 ID. 문의가 들어오면 이 값으로 로그를 바로 찾는다.
   *
   * HTTP 경계 밖에서 발생한 예외에는 실행 컨텍스트가 없어
   * ExecutionContext.getTraceId()가 undefined를 돌려줄 수 있어 필수가 아니다.
   */
  @ApiPropertyOptional({
    description:
      '요청 추적 ID. 실행 컨텍스트가 없는 경우(HTTP 경계 밖) 빠질 수 있다.',
    example: '3f6b1c8e-1f0e-4a1d-9d3c-2b7a9f5e4c11',
    format: 'uuid',
  })
  traceId?: string;
}
