import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { dataSchema } from 'src/common/swagger/dataResponse.schema';
import { JwtAuthGuard } from 'src/domains/auth/guards/jwt-auth.guard';
import { AssetSummaryResponseDto } from '../dto/response/asset-summary-response.dto';
import { AssetSummaryService } from '../services/asset-summary.service';

@ApiTags('Assets')
@ApiExtraModels(AssetSummaryResponseDto)
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetSummaryService: AssetSummaryService) {}

  @Get('summary')
  @ApiOperation({
    summary: '자산 요약 조회',
    description:
      '사용자의 전체 자산을 요약해 조회한다. 숨김 처리된 종목과 전량 매도한 종목은 집계에서 제외한다.',
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: dataSchema(AssetSummaryResponseDto),
  })
  getSummary(@CurrentUser() user: AuthUser): Promise<AssetSummaryResponseDto> {
    return this.assetSummaryService.getAssetSummary(user.id);
  }
}
