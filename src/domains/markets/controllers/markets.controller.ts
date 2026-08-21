import { Param, Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { MarketsService } from '../services/markets.service';
import { MarketsDto } from '../dto/markets.dto';

@Controller('stocks')
@UseGuards(StubAuthGuard)
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get(':stockCode')
  getStock(@CurrentUser() user: AuthUser, @Param() params: MarketsDto) {
    return this.marketsService.getStock(user.id, params.stockCode);
  }
}
