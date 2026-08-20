import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateFavoriteStockDto } from '../dto/request/create-favorite-stock.dto';
import { FavoriteStockErrorResponseDto } from '../dto/response/favorite-stock-error-response.dto';
import { FavoriteStockItemDto } from '../dto/response/favorite-stock-item.dto';
import { FavoriteStockListResponseDto } from '../dto/response/favorite-stock-list-response.dto';
import { FavoriteStockStatusResponseDto } from '../dto/response/favorite-stock-status-response.dto';
import { RemoveFavoriteStockResponseDto } from '../dto/response/remove-favorite-stock-response.dto';
import { FavoriteStocksService } from '../services/favorite-stocks.service';

/**
 * 관심종목 컨트롤러.
 *
 * users 도메인에 숨김종목이 별도 담당자로 들어올 예정이라 리소스 단위로
 * 파일을 나눈다. 경로 접두사도 여기서 고정한다.
 *
 * 인증이 아직 구현되지 않아 현재는 StubAuthGuard다. 실제 JWT 가드가
 * 나오면 이 데코레이터만 바꾸면 되고, @CurrentUser()를 쓰는 핸들러는
 * 손대지 않아도 된다. Swagger 쪽도 같이 바뀐다. 아래 x-stub-user-id
 * 헤더 문서를 지우고 @ApiBearerAuth()를 단다.
 */
@ApiTags('Favorite Stocks')
@ApiExtraModels(
  FavoriteStockListResponseDto,
  FavoriteStockItemDto,
  FavoriteStockStatusResponseDto,
  RemoveFavoriteStockResponseDto,
  FavoriteStockErrorResponseDto,
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
  type: FavoriteStockErrorResponseDto,
})
@Controller('users/me/favorite-stocks')
@UseGuards(StubAuthGuard)
export class FavoriteStocksController {
  constructor(private readonly favoriteStocksService: FavoriteStocksService) {}

  @Get()
  @ApiOperation({
    summary: '관심종목 목록 조회',
    description:
      '인증된 사용자의 관심종목을 최근 등록 순으로 조회한다. 등록된 종목이 없어도 빈 배열을 반환한다.',
  })
  @ApiOkResponse({
    description: '관심종목 목록 조회 성공',
    schema: dataSchema(FavoriteStockListResponseDto),
  })
  findFavoriteStocks(
    @CurrentUser() user: AuthUser,
  ): Promise<FavoriteStockListResponseDto> {
    return this.favoriteStocksService.findFavoriteStocks(user.id);
  }

  @Post()
  @ApiOperation({
    summary: '관심종목 등록',
    description:
      '종목을 관심종목으로 등록한다. 종목 마스터가 없어 실재 여부는 검증하지 않고 6자리 형식만 확인하며, stockName은 클라이언트가 보낸 값을 그대로 저장한다. 종목 조회 서비스가 연동되면 STOCK_NOT_FOUND(404)가 추가된다.',
  })
  @ApiCreatedResponse({
    description: '관심종목 등록 성공',
    schema: dataSchema(FavoriteStockItemDto),
  })
  @ApiBadRequestResponse({
    description:
      '요청 검증 실패: stockCode가 6자리 숫자가 아니거나 stockName이 비었거나 100자를 초과함',
    type: FavoriteStockErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'FAVORITE_STOCK_ALREADY_EXISTS: 이미 등록된 종목',
    type: FavoriteStockErrorResponseDto,
  })
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
  @Get(':stockCode')
  @ApiOperation({
    summary: '관심종목 등록 여부 조회',
    description:
      '종목 상세 화면의 하트 상태를 그리는 용도다. "리소스를 가져와라"가 아니라 "등록 여부를 물어본다"는 질의이므로 미등록도 404가 아니라 200이며, 이때 favoriteStock은 null이다.',
  })
  @ApiParam({
    name: 'stockCode',
    description: '종목 코드. 국내 종목 기준 6자리 숫자.',
    schema: { type: 'string', pattern: '^\\d{6}$' },
    example: '005930',
  })
  @ApiOkResponse({
    description: '등록 여부 조회 성공. 미등록도 이 응답이다.',
    schema: dataSchema(FavoriteStockStatusResponseDto),
  })
  @ApiBadRequestResponse({
    description: 'stockCode가 6자리 숫자가 아님',
    type: FavoriteStockErrorResponseDto,
  })
  findFavoriteStockStatus(
    @CurrentUser() user: AuthUser,
    @Param('stockCode', ParseStockCodePipe) stockCode: string,
  ): Promise<FavoriteStockStatusResponseDto> {
    return this.favoriteStocksService.findFavoriteStockStatus(
      user.id,
      stockCode,
    );
  }

  @Delete(':stockCode')
  @ApiOperation({
    summary: '관심종목 해제',
    description:
      '등록된 관심종목을 해제한다. 등록 여부 조회와 달리 대상이 없으면 404다. 해제할 대상을 가리키는 요청이라 대상이 없는 것은 오류이기 때문이다.',
  })
  @ApiParam({
    name: 'stockCode',
    description: '종목 코드. 국내 종목 기준 6자리 숫자.',
    schema: { type: 'string', pattern: '^\\d{6}$' },
    example: '005930',
  })
  @ApiOkResponse({
    description: '관심종목 해제 성공',
    schema: dataSchema(RemoveFavoriteStockResponseDto),
  })
  @ApiBadRequestResponse({
    description: 'stockCode가 6자리 숫자가 아님',
    type: FavoriteStockErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'FAVORITE_STOCK_NOT_FOUND: 등록된 관심종목이 아님',
    type: FavoriteStockErrorResponseDto,
  })
  removeFavoriteStock(
    @CurrentUser() user: AuthUser,
    @Param('stockCode', ParseStockCodePipe) stockCode: string,
  ): Promise<RemoveFavoriteStockResponseDto> {
    return this.favoriteStocksService.removeFavoriteStock(user.id, stockCode);
  }
}
