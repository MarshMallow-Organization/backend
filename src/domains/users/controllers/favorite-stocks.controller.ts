import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { ParseStockCodePipe } from 'src/common/pipe/parseStockCode.pipe';
import { ApiDataResponse } from 'src/common/swagger/apiDataResponse.decorator';
import {
  ApiErrorResponses,
  CommonErrorCode,
} from 'src/common/swagger/apiErrorResponses.decorator';
import { STUB_AUTH_SECURITY_SCHEME } from 'src/common/swagger/securitySchemes';
import { CreateFavoriteStockDto } from '../dto/request/create-favorite-stock.dto';
import { FavoriteStockItemDto } from '../dto/response/favorite-stock-item.dto';
import { FavoriteStockListResponseDto } from '../dto/response/favorite-stock-list-response.dto';
import { FavoriteStockStatusResponseDto } from '../dto/response/favorite-stock-status-response.dto';
import { RemoveFavoriteStockResponseDto } from '../dto/response/remove-favorite-stock-response.dto';
import { FavoriteStocksErrorCode } from '../favorite-stocks.error';
import { FavoriteStocksService } from '../services/favorite-stocks.service';

/** 경로 파라미터 stockCode. 세 핸들러가 같은 설명을 공유한다. */
const StockCodeParam = ApiParam({
  name: 'stockCode',
  description: '종목 코드. 국내 종목 기준 6자리 숫자.',
  schema: { type: 'string', pattern: '^\\d{6}$' },
  example: '005930',
});

/**
 * 관심종목 컨트롤러.
 *
 * users 도메인에 숨김종목이 별도 담당자로 들어올 예정이라 리소스 단위로
 * 파일을 나눈다. 경로 접두사도 여기서 고정한다.
 *
 * 인증이 아직 구현되지 않아 현재는 StubAuthGuard다. 실제 JWT 가드가
 * 나오면 이 데코레이터만 바꾸면 되고, @CurrentUser()를 쓰는 핸들러는
 * 손대지 않아도 된다. 문서의 @ApiSecurity도 그때 @ApiBearerAuth로 바꾼다.
 */
@ApiTags('관심종목')
@ApiSecurity(STUB_AUTH_SECURITY_SCHEME)
@Controller('users/me/favorite-stocks')
@UseGuards(StubAuthGuard)
export class FavoriteStocksController {
  constructor(private readonly favoriteStocksService: FavoriteStocksService) {}

  @ApiOperation({
    summary: '관심종목 목록 조회',
    description:
      '로그인한 사용자의 관심종목을 최근 등록 순으로 돌려준다. 등록된 종목이 없으면 빈 배열이다.',
  })
  @ApiDataResponse(FavoriteStockListResponseDto, {
    description: '조회 성공.',
  })
  @ApiErrorResponses(CommonErrorCode.UNAUTHORIZED)
  @Get()
  findFavoriteStocks(
    @CurrentUser() user: AuthUser,
  ): Promise<FavoriteStockListResponseDto> {
    return this.favoriteStocksService.findFavoriteStocks(user.id);
  }

  @ApiOperation({
    summary: '관심종목 등록',
    description:
      '종목을 관심종목으로 등록한다.\n\n종목 마스터가 없어 실재하는 종목인지는 확인하지 않는다. 현재는 6자리 숫자 형식만 검증하며, stockName은 클라이언트가 보낸 값을 그대로 저장한다.',
  })
  @ApiDataResponse(FavoriteStockItemDto, {
    status: HttpStatus.CREATED,
    description: '등록 성공.',
  })
  @ApiErrorResponses(
    CommonErrorCode.BAD_REQUEST,
    CommonErrorCode.UNAUTHORIZED,
    FavoriteStocksErrorCode.FAVORITE_STOCK_ALREADY_EXISTS,
  )
  @Post()
  createFavoriteStock(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFavoriteStockDto,
  ): Promise<FavoriteStockItemDto> {
    return this.favoriteStocksService.createFavoriteStock(user.id, dto);
  }

  /**
   * 등록 여부 조회. 미등록도 200이다.
   *
   * 인자 없는 @Get()보다 아래에 둔다. 경로가 겹치지는 않지만, 구체적인
   * 라우트를 파라미터 라우트보다 위에 두는 이 저장소 규칙을 따른다.
   */
  @ApiOperation({
    summary: '관심종목 등록 여부 조회',
    description:
      '종목 상세 화면의 하트 상태를 그리는 용도다.\n\n**미등록도 404가 아니라 200이다.** "리소스를 가져와라"가 아니라 "등록 여부를 물어본다"는 질의이므로 미등록 역시 정상 응답이며, 이때 `favoriteStock`이 null이 된다.',
  })
  @StockCodeParam
  @ApiDataResponse(FavoriteStockStatusResponseDto, {
    description: '조회 성공. 미등록이어도 200이다.',
  })
  @ApiErrorResponses(CommonErrorCode.BAD_REQUEST, CommonErrorCode.UNAUTHORIZED)
  @Get(':stockCode')
  findFavoriteStockStatus(
    @CurrentUser() user: AuthUser,
    @Param('stockCode', ParseStockCodePipe) stockCode: string,
  ): Promise<FavoriteStockStatusResponseDto> {
    return this.favoriteStocksService.findFavoriteStockStatus(
      user.id,
      stockCode,
    );
  }

  @ApiOperation({
    summary: '관심종목 해제',
    description:
      '관심종목을 해제한다. 등록되어 있지 않으면 FAVORITE_STOCK_NOT_FOUND(404)다.',
  })
  @StockCodeParam
  @ApiDataResponse(RemoveFavoriteStockResponseDto, {
    description: '해제 성공.',
  })
  @ApiErrorResponses(
    CommonErrorCode.BAD_REQUEST,
    CommonErrorCode.UNAUTHORIZED,
    FavoriteStocksErrorCode.FAVORITE_STOCK_NOT_FOUND,
  )
  @Delete(':stockCode')
  removeFavoriteStock(
    @CurrentUser() user: AuthUser,
    @Param('stockCode', ParseStockCodePipe) stockCode: string,
  ): Promise<RemoveFavoriteStockResponseDto> {
    return this.favoriteStocksService.removeFavoriteStock(user.id, stockCode);
  }
}
