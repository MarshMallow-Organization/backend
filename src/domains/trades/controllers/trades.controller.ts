import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { CreateTradeDto } from '../dto/request/create-trade.dto';
import { GetTradesQueryDto } from '../dto/request/get-trades-query.dto';
import { TradeDeletedResponseDto } from '../dto/response/trade-deleted-response.dto';
import { TradeListResponseDto } from '../dto/response/trade-list-response.dto';
import { TradeResponseDto } from '../dto/response/trade-response.dto';
import { TradesService } from '../services/trades.service';

@Controller('trades')
@UseGuards(StubAuthGuard)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post()
  async createTrade(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTradeDto,
  ): Promise<TradeResponseDto> {
    return this.tradesService.createTrade(user.id, dto);
  }

  @Get()
  async getTrades(
    @CurrentUser() user: AuthUser,
    @Query() query: GetTradesQueryDto,
  ): Promise<TradeListResponseDto> {
    return this.tradesService.getTrades(user.id, query);
  }

  @Get(':id')
  async getTradeById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TradeResponseDto> {
    return this.tradesService.getTradeById(id, user.id);
  }

  @Delete(':id')
  async deleteTrade(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TradeDeletedResponseDto> {
    return this.tradesService.deleteTrade(id, user.id);
  }
}
