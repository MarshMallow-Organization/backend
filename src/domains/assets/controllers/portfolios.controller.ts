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
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { CreatePortfolioDto } from '../dto/request/create-portfolio.dto';
import { ReorderPortfoliosDto } from '../dto/request/reorder-portfolios.dto';
import { UpdatePortfolioNameDto } from '../dto/request/update-portfolio-name.dto';
import { PortfolioDeletedDto } from '../dto/response/portfolio-deleted.dto';
import { PortfolioListResponseDto } from '../dto/response/portfolio-list-response.dto';
import { PortfolioNameUpdatedDto } from '../dto/response/portfolio-name-updated.dto';
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
 * 손대지 않아도 된다.
 */
@Controller('assets/portfolios')
@UseGuards(StubAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  findPortfolios(
    @CurrentUser() user: AuthUser,
  ): Promise<PortfolioListResponseDto> {
    return this.portfoliosService.findPortfolios(user.id);
  }

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
  @Patch('order')
  reorderPortfolios(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderPortfoliosDto,
  ): Promise<PortfolioListResponseDto> {
    return this.portfoliosService.reorderPortfolios(user.id, dto);
  }

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

  @Delete(':portfolioId')
  deletePortfolio(
    @CurrentUser() user: AuthUser,
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
  ): Promise<PortfolioDeletedDto> {
    return this.portfoliosService.deletePortfolio(user.id, portfolioId);
  }
}
