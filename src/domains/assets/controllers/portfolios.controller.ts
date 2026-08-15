import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { ApiDataResponse } from 'src/common/swagger/apiDataResponse.decorator';
import {
  ApiErrorResponses,
  CommonErrorCode,
} from 'src/common/swagger/apiErrorResponses.decorator';
import { STUB_AUTH_SECURITY_SCHEME } from 'src/common/swagger/securitySchemes';
import { CreatePortfolioDto } from '../dto/request/create-portfolio.dto';
import { ReorderPortfoliosDto } from '../dto/request/reorder-portfolios.dto';
import { UpdatePortfolioNameDto } from '../dto/request/update-portfolio-name.dto';
import { PortfolioDeletedDto } from '../dto/response/portfolio-deleted.dto';
import { PortfolioListResponseDto } from '../dto/response/portfolio-list-response.dto';
import { PortfolioNameUpdatedDto } from '../dto/response/portfolio-name-updated.dto';
import { PortfolioSummaryDto } from '../dto/response/portfolio-summary.dto';
import { PortfoliosErrorCode } from '../portfolios.error';
import { PortfoliosService } from '../services/portfolios.service';

/** 경로 파라미터 portfolioId. 수정·삭제가 같은 설명을 공유한다. */
const PortfolioIdParam = ApiParam({
  name: 'portfolioId',
  description: '가상계좌 ID.',
  schema: { type: 'integer' },
  example: 12,
});

/**
 * 가상계좌 컨트롤러.
 *
 * assets 도메인에 summary·holdings가 별도 담당자로 들어올 예정이라
 * 리소스 단위로 파일을 나눈다. 경로 접두사도 여기서 고정한다.
 *
 * 인증이 아직 구현되지 않아 현재는 StubAuthGuard다. 실제 JWT 가드가
 * 나오면 이 데코레이터만 바꾸면 되고, @CurrentUser()를 쓰는 핸들러는
 * 손대지 않아도 된다. 문서의 @ApiSecurity도 그때 @ApiBearerAuth로 바꾼다.
 */
@ApiTags('가상계좌')
@ApiSecurity(STUB_AUTH_SECURITY_SCHEME)
@Controller('assets/portfolios')
@UseGuards(StubAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @ApiOperation({
    summary: '가상계좌 목록 조회',
    description:
      'sortOrder 오름차순으로 가상계좌를 돌려준다. 목록이 비어 있어도 생성 가능한 최대 개수(maxCount)는 항상 포함한다.',
  })
  @ApiDataResponse(PortfolioListResponseDto, { description: '조회 성공.' })
  @ApiErrorResponses(CommonErrorCode.UNAUTHORIZED)
  @Get()
  findPortfolios(
    @CurrentUser() user: AuthUser,
  ): Promise<PortfolioListResponseDto> {
    return this.portfoliosService.findPortfolios(user.id);
  }

  @ApiOperation({
    summary: '가상계좌 생성',
    description:
      '가상계좌를 만든다. 이름은 사용자 내에서 유일해야 하며, 사용자당 최대 4개까지 만들 수 있다.',
  })
  @ApiDataResponse(PortfolioSummaryDto, {
    status: HttpStatus.CREATED,
    description: '생성 성공.',
  })
  @ApiErrorResponses(
    CommonErrorCode.BAD_REQUEST,
    CommonErrorCode.UNAUTHORIZED,
    PortfoliosErrorCode.PORTFOLIO_NAME_DUPLICATED,
    PortfoliosErrorCode.PORTFOLIO_LIMIT_EXCEEDED,
  )
  @Post()
  createPortfolio(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePortfolioDto,
  ): Promise<PortfolioSummaryDto> {
    return this.portfoliosService.createPortfolio(user.id, dto);
  }

  /**
   * ⚠️ 이 핸들러는 @Patch(':portfolioId')보다 반드시 위에 선언한다.
   *
   * NestJS는 선언 순서대로 매칭하므로, 아래에 두면 'order'가 :portfolioId로
   * 먼저 잡혀 ParseIntPipe에서 400이 난다.
   */
  @ApiOperation({
    summary: '가상계좌 순서 변경',
    description:
      '보유한 가상계좌 전체를 원하는 순서대로 나열해 보낸다. 배열 인덱스가 그대로 sortOrder가 된다.\n\n일부만 보내거나 중복·타인 계좌가 섞이면 모두 `PORTFOLIO_ORDER_MISMATCH`(400)다. 어느 쪽이 틀렸는지 나누면 타인의 계좌 ID 존재 여부를 응답으로 캐낼 수 있기 때문이다.',
  })
  @ApiDataResponse(PortfolioListResponseDto, {
    description: '변경 성공. 변경된 순서의 전체 목록을 돌려준다.',
  })
  @ApiErrorResponses(
    CommonErrorCode.BAD_REQUEST,
    PortfoliosErrorCode.PORTFOLIO_ORDER_MISMATCH,
    CommonErrorCode.UNAUTHORIZED,
  )
  @Patch('order')
  reorderPortfolios(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderPortfoliosDto,
  ): Promise<PortfolioListResponseDto> {
    return this.portfoliosService.reorderPortfolios(user.id, dto);
  }

  @ApiOperation({
    summary: '가상계좌 이름 변경',
    description:
      '가상계좌 이름을 바꾼다. 존재하지 않거나 타인의 계좌면 모두 `PORTFOLIO_NOT_FOUND`(404)다.',
  })
  @PortfolioIdParam
  @ApiDataResponse(PortfolioNameUpdatedDto, { description: '변경 성공.' })
  @ApiErrorResponses(
    CommonErrorCode.BAD_REQUEST,
    CommonErrorCode.UNAUTHORIZED,
    PortfoliosErrorCode.PORTFOLIO_NOT_FOUND,
    PortfoliosErrorCode.PORTFOLIO_NAME_DUPLICATED,
  )
  @Patch(':portfolioId')
  updatePortfolioName(
    @CurrentUser() user: AuthUser,
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
    @Body() dto: UpdatePortfolioNameDto,
  ): Promise<PortfolioNameUpdatedDto> {
    return this.portfoliosService.updatePortfolioName(
      user.id,
      portfolioId,
      dto,
    );
  }

  @ApiOperation({
    summary: '가상계좌 삭제',
    description:
      '가상계좌를 삭제한다. 존재하지 않거나 타인의 계좌면 모두 `PORTFOLIO_NOT_FOUND`(404)다.',
  })
  @PortfolioIdParam
  @ApiDataResponse(PortfolioDeletedDto, { description: '삭제 성공.' })
  @ApiErrorResponses(
    CommonErrorCode.BAD_REQUEST,
    CommonErrorCode.UNAUTHORIZED,
    PortfoliosErrorCode.PORTFOLIO_NOT_FOUND,
  )
  @Delete(':portfolioId')
  deletePortfolio(
    @CurrentUser() user: AuthUser,
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
  ): Promise<PortfolioDeletedDto> {
    return this.portfoliosService.deletePortfolio(user.id, portfolioId);
  }
}
