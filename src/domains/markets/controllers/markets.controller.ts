import { Param, Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { MarketsService } from '../services/markets.service';
import { GetStockParamDto } from '../dto/request/get-stock-param.dto';
import { GetStocksQueryDto } from '../dto/request/get-stocks-query.dto';
import {
  GetStockResponseDto,
  HiddenStockDetailResponseDto,
  StockDetailResponseDto,
} from '../dto/response/get-stock-response.dto';
import { GetStocksResponseDto } from '../dto/response/get-stocks-response.dto';

@ApiTags('Markets')
@ApiExtraModels(StockDetailResponseDto, HiddenStockDetailResponseDto)
@Controller('stocks')
@UseGuards(StubAuthGuard)
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get()
  @ApiOperation({ summary: '종목 목록 검색' })
  @ApiOkResponse({
    description: 'DB에 저장된 활성 종목 검색 결과',
    type: GetStocksResponseDto,
  })
  getStocks(@Query() query: GetStocksQueryDto): Promise<GetStocksResponseDto> {
    return this.marketsService.getStocks(query);
  }

  @Get(':stockCode')
  @ApiOperation({ summary: '종목 상세 조회' })
  @ApiOkResponse({
    description: '일반 종목 상세 정보 또는 숨김 종목 정보',
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          oneOf: [
            { $ref: getSchemaPath(StockDetailResponseDto) },
            { $ref: getSchemaPath(HiddenStockDetailResponseDto) },
          ],
          discriminator: { propertyName: 'isHidden' },
        },
      },
    },
  })
  getStock(
    @CurrentUser() user: AuthUser,
    @Param() params: GetStockParamDto,
  ): Promise<GetStockResponseDto> {
    return this.marketsService.getStock(user.id, params.stockCode);
  }
}
