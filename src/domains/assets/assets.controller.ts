import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { AssetsService } from './assets.service';
import { CreatePortfolioDto } from './dto/createPortfolio.dto';

/**
 * 자산 도메인 컨트롤러.
 *
 * 인증은 아직 StubAuthGuard다. 실제 JWT 가드가 나오면 이 데코레이터만
 * 바꾸면 되고, @CurrentUser()를 쓰는 핸들러는 손대지 않아도 된다.
 */
@Controller('assets')
@UseGuards(StubAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('portfolios')
  createPortfolio(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePortfolioDto,
  ) {
    return this.assetsService.createPortfolio(user.id, dto);
  }
}
