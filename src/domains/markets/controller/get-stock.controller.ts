import { Param, Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { GetStockService } from '../services/get-stock.service';
import { ParseStockCodePipe } from 'src/common/pipe/parseStockCode.pipe';

@Controller('stocks')
@UseGuards(StubAuthGuard)
export class GetStockController {
  constructor(private readonly getStocksService: GetStockService) {}

  @Get(':symbol')
  getStock(
    @CurrentUser() user: AuthUser,
    @Param('symbol', ParseStockCodePipe) symbol: string,
  ) {
    return this.getStocksService.getStock(user.id, symbol);
  }
}
