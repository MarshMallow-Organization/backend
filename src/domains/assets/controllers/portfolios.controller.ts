import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { ParseStockCodePipe } from 'src/common/pipe/parseStockCode.pipe';
import { dataSchema } from 'src/common/swagger/dataResponse.schema';
import { AddPortfolioStockDto } from '../dto/request/add-portfolio-stock.dto';
import { CreatePortfolioDto } from '../dto/request/create-portfolio.dto';
import { ReorderPortfoliosDto } from '../dto/request/reorder-portfolios.dto';
import { UpdatePortfolioNameDto } from '../dto/request/update-portfolio-name.dto';
import { PortfolioDeletedDto } from '../dto/response/portfolio-deleted.dto';
import { PortfolioErrorResponseDto } from '../dto/response/portfolio-error-response.dto';
import { PortfolioListResponseDto } from '../dto/response/portfolio-list-response.dto';
import { PortfolioNameUpdatedDto } from '../dto/response/portfolio-name-updated.dto';
import { PortfolioStockAddedDto } from '../dto/response/portfolio-stock-added.dto';
import { PortfolioStockRemovedDto } from '../dto/response/portfolio-stock-removed.dto';
import { PortfolioSummaryDto } from '../dto/response/portfolio-summary.dto';
import { PortfoliosService } from '../services/portfolios.service';

/**
 * 가상계좌 컨트롤러.
 *
 * assets 도메인에 summary·holdings가 별도 담당자로 들어올 예정이라
 * 리소스 단위로 파일을 나눈다. 경로 접두사도 여기서 고정한다.
 *
 * 인증이 아직 구현되지 않아 현재는 StubAuthGuard다. 실제 JWT 가드가
 * 나오면 이 데코레이터만 바꾸면 되고, @CurrentUser()를 쓰는 핸들러는
 * 손대지 않아도 된다. Swagger 쪽도 같이 바뀐다. 아래 x-stub-user-id
 * 헤더 문서를 지우고 @ApiBearerAuth()를 단다.
 */
@ApiTags('Portfolios')
@ApiExtraModels(
  PortfolioListResponseDto,
  PortfolioSummaryDto,
  PortfolioNameUpdatedDto,
  PortfolioDeletedDto,
  PortfolioStockAddedDto,
  PortfolioStockRemovedDto,
  PortfolioErrorResponseDto,
)
@ApiHeader({
  name: 'x-stub-user-id',
  description:
    '로컬 스텁 인증용 사용자 ID. 생략하면 1을 사용하며, STUB_AUTH_ENABLED=true일 때만 동작한다.',
  required: false,
  schema: { type: 'integer', minimum: 1, default: 1 },
})
@ApiUnauthorizedResponse({
  description: '스텁 인증 비활성화 또는 올바르지 않은 사용자 ID',
  type: PortfolioErrorResponseDto,
})
@Controller('assets/portfolios')
@UseGuards(StubAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  @ApiOperation({
    summary: '가상계좌 목록 조회',
    description:
      '인증된 사용자의 가상계좌를 sortOrder 오름차순으로 조회한다. 기본 정보만 내려주고 보유 종목은 포함하지 않으며, 계좌가 없어도 빈 배열과 maxCount를 반환한다.',
  })
  @ApiOkResponse({
    description: '가상계좌 목록 조회 성공',
    schema: dataSchema(PortfolioListResponseDto),
  })
  findPortfolios(
    @CurrentUser() user: AuthUser,
  ): Promise<PortfolioListResponseDto> {
    return this.portfoliosService.findPortfolios(user.id);
  }

  @Post()
  @ApiOperation({
    summary: '가상계좌 생성',
    description:
      '가상계좌를 생성한다. 사용자당 최대 4개이며 이름은 사용자 내에서 유일해야 한다. sortOrder는 기존 최대값 + 1로 매겨진다.',
  })
  @ApiCreatedResponse({
    description: '가상계좌 생성 성공',
    schema: dataSchema(PortfolioSummaryDto),
  })
  @ApiBadRequestResponse({
    description: '요청 검증 실패: name이 비었거나 30자를 초과함',
    type: PortfolioErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'PORTFOLIO_LIMIT_EXCEEDED: 이미 4개 보유, PORTFOLIO_NAME_DUPLICATED: 같은 이름의 계좌가 있음',
    type: PortfolioErrorResponseDto,
  })
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
  @Patch('order')
  @ApiOperation({
    summary: '가상계좌 순서 변경',
    description:
      '이동 명령이 아니라 변경 후 최종 순서 전체를 받는다. 배열 인덱스가 그대로 sortOrder가 되므로 보유한 계좌 전부를 중복 없이 보내야 한다.',
  })
  @ApiOkResponse({
    description: '순서 변경 후의 전체 목록',
    schema: dataSchema(PortfolioListResponseDto),
  })
  @ApiBadRequestResponse({
    description:
      '요청 검증 실패 또는 PORTFOLIO_ORDER_MISMATCH: 배열에 중복이 있거나, 보유하지 않은 ID가 섞였거나, 보유 개수와 일치하지 않음',
    type: PortfolioErrorResponseDto,
  })
  reorderPortfolios(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderPortfoliosDto,
  ): Promise<PortfolioListResponseDto> {
    return this.portfoliosService.reorderPortfolios(user.id, dto);
  }

  @Patch(':portfolioId')
  @ApiOperation({
    summary: '가상계좌 이름 변경',
    description:
      '이름만 변경하고 sortOrder는 건드리지 않는다. 같은 이름을 다시 보내는 요청은 중복으로 보지 않고 성공한다.',
  })
  @ApiParam({
    name: 'portfolioId',
    description: '가상계좌 ID',
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiOkResponse({
    description: '이름 변경 성공',
    schema: dataSchema(PortfolioNameUpdatedDto),
  })
  @ApiBadRequestResponse({
    description: '요청 검증 실패 또는 portfolioId가 정수가 아님',
    type: PortfolioErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'PORTFOLIO_NOT_FOUND: 계좌가 없거나 다른 사용자의 계좌',
    type: PortfolioErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'PORTFOLIO_NAME_DUPLICATED: 같은 이름의 다른 계좌가 있음',
    type: PortfolioErrorResponseDto,
  })
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

  @Delete(':portfolioId')
  @ApiOperation({
    summary: '가상계좌 삭제',
    description:
      '가상계좌와 그 계좌에 담긴 종목을 함께 삭제한다. 종목이 남아 있어도 실패하지 않으며 거래 기록은 영향받지 않는다. 남은 계좌의 sortOrder는 재계산하지 않는다.',
  })
  @ApiParam({
    name: 'portfolioId',
    description: '가상계좌 ID',
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiOkResponse({
    description: '삭제 성공',
    schema: dataSchema(PortfolioDeletedDto),
  })
  @ApiBadRequestResponse({
    description: 'portfolioId가 정수가 아님',
    type: PortfolioErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'PORTFOLIO_NOT_FOUND: 계좌가 없거나 다른 사용자의 계좌',
    type: PortfolioErrorResponseDto,
  })
  deletePortfolio(
    @CurrentUser() user: AuthUser,
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
  ): Promise<PortfolioDeletedDto> {
    return this.portfoliosService.deletePortfolio(user.id, portfolioId);
  }

  @Post(':portfolioId/stocks')
  @ApiOperation({
    summary: '가상계좌에 종목 추가',
    description:
      '한 종목은 사용자당 하나의 계좌에만 속한다. 같은 종목이 두 계좌에 들어가면 수량과 평가손익이 양쪽에 중복 계상되기 때문이다. 종목 마스터가 없어 실재 여부는 검증하지 않고 6자리 형식만 확인한다.',
  })
  @ApiParam({
    name: 'portfolioId',
    description: '가상계좌 ID',
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiCreatedResponse({
    description: '종목 추가 성공',
    schema: dataSchema(PortfolioStockAddedDto),
  })
  @ApiBadRequestResponse({
    description: 'stockCode가 6자리 숫자가 아니거나 portfolioId가 정수가 아님',
    type: PortfolioErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'PORTFOLIO_NOT_FOUND: 계좌가 없거나 다른 사용자의 계좌',
    type: PortfolioErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'PORTFOLIO_STOCK_ALREADY_ADDED: 이 계좌에 이미 있음, PORTFOLIO_STOCK_IN_OTHER_PORTFOLIO: 같은 사용자의 다른 계좌에 있음',
    type: PortfolioErrorResponseDto,
  })
  addStock(
    @CurrentUser() user: AuthUser,
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
    @Body() dto: AddPortfolioStockDto,
  ): Promise<PortfolioStockAddedDto> {
    return this.portfoliosService.addStock(user.id, portfolioId, dto);
  }

  /**
   * stockCode는 본문이 아니라 경로에 있어 전역 ValidationPipe가 형식을
   * 보지 않는다. 그대로 두면 형식이 틀린 코드가 '조회했더니 없더라'로
   * 흘러 404가 되는데, 명세는 형식 오류를 400으로 요구한다.
   *
   * 관심종목 쪽과 같은 ParseStockCodePipe를 쓴다. 그 파이프가 도메인이
   * 아니라 common에 있는 이유가 이 핸들러다.
   */
  @Delete(':portfolioId/stocks/:stockCode')
  @ApiOperation({
    summary: '가상계좌에서 종목 제거',
    description:
      '계좌에서 종목만 뺀다. 거래 기록은 영향받지 않는다. 404가 두 종류이므로 프론트는 코드로 구분해 처리한다.',
  })
  @ApiParam({
    name: 'portfolioId',
    description: '가상계좌 ID',
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiParam({
    name: 'stockCode',
    description: '종목 코드. 국내 종목 기준 6자리 숫자.',
    schema: { type: 'string', pattern: '^\\d{6}$' },
    example: '005930',
  })
  @ApiOkResponse({
    description: '종목 제거 성공',
    schema: dataSchema(PortfolioStockRemovedDto),
  })
  @ApiBadRequestResponse({
    description: 'stockCode가 6자리 숫자가 아니거나 portfolioId가 정수가 아님',
    type: PortfolioErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'PORTFOLIO_NOT_FOUND: 계좌가 없거나 다른 사용자의 계좌, PORTFOLIO_STOCK_NOT_FOUND: 계좌는 있으나 그 종목이 등록돼 있지 않음',
    type: PortfolioErrorResponseDto,
  })
  removeStock(
    @CurrentUser() user: AuthUser,
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
    @Param('stockCode', ParseStockCodePipe) stockCode: string,
  ): Promise<PortfolioStockRemovedDto> {
    return this.portfoliosService.removeStock(user.id, portfolioId, stockCode);
  }
}
