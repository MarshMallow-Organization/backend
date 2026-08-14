import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { CreateFavoriteStockDto } from '../dto/request/create-favorite-stock.dto';
import { FavoriteStockItemDto } from '../dto/response/favorite-stock-item.dto';
import { FavoriteStockListResponseDto } from '../dto/response/favorite-stock-list-response.dto';
import { FavoriteStocksService } from '../services/favorite-stocks.service';

/**
 * 관심종목 컨트롤러.
 *
 * users 도메인에 숨김종목이 별도 담당자로 들어올 예정이라 리소스 단위로
 * 파일을 나눈다. 경로 접두사도 여기서 고정한다.
 *
 * 인증이 아직 구현되지 않아 현재는 StubAuthGuard다. 실제 JWT 가드가
 * 나오면 이 데코레이터만 바꾸면 되고, @CurrentUser()를 쓰는 핸들러는
 * 손대지 않아도 된다.
 */
@Controller('users/me/favorite-stocks')
@UseGuards(StubAuthGuard)
export class FavoriteStocksController {
  constructor(private readonly favoriteStocksService: FavoriteStocksService) {}

  @Get()
  findFavoriteStocks(
    @CurrentUser() user: AuthUser,
  ): Promise<FavoriteStockListResponseDto> {
    return this.favoriteStocksService.findFavoriteStocks(user.id);
  }

  @Post()
  createFavoriteStock(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFavoriteStockDto,
  ): Promise<FavoriteStockItemDto> {
    return this.favoriteStocksService.createFavoriteStock(user.id, dto);
  }
}
