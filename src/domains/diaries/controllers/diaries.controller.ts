import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { GetDiariesQueryDto } from '../dto/request/get-diaries-query.dto';
import { PostDiariesDto } from '../dto/request/post-diaries.dto';
import { UpdateDiaryDto } from '../dto/request/update-diary.dto';
import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { GetDiariesResponseDto } from '../dto/response/get-diaries-response.dto';
import { UpdateDiaryResponseDto } from '../dto/response/update-diary-response.dto';
import {
  UpdateDiaryBody,
  UpdateDiaryValidationPipe,
} from '../pipes/update-diary-validation.pipe';
import { DiaryErrorResponseDto } from '../dto/response/diary-error-response.dto';
import { DiariesService } from '../services/diaries.service';
import { DiaryDetailResponseDto } from '../dto/response/diary-detail-response.dto';
import { ParseDiaryIdPipe } from '../pipes/parse-diary-id.pipe';
import { DiaryPrefillResponseDto } from '../dto/response/diary-prefill-response.dto';
import { ParseOrderIdPipe } from '../pipes/parse-order-id.pipe';

@ApiTags('Diaries')
@ApiExtraModels(
  CreateDiaryResponseDto,
  GetDiariesResponseDto,
  DiaryErrorResponseDto,
  UpdateDiaryResponseDto,
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
  type: DiaryErrorResponseDto,
})
@Controller('diaries')
@UseGuards(StubAuthGuard)
export class DiariesController {
  constructor(private readonly diariesService: DiariesService) {}

  @Post()
  @ApiOperation({
    summary: '매매 일기 생성',
    description:
      '인증된 사용자의 주문을 기준으로 BUY 또는 SELL 일기를 생성한다. 요청의 type은 주문 유형과 일치해야 한다.',
  })
  @ApiCreatedResponse({
    description: '매매 일기 생성 성공',
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: { $ref: getSchemaPath(CreateDiaryResponseDto) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '요청 검증 실패 또는 ORDER_TYPE_MISMATCH',
    type: DiaryErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'ORDER_NOT_FOUND: 주문이 없거나 다른 사용자의 주문',
    type: DiaryErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'DIARY_ALREADY_EXISTS: 해당 주문의 활성 일기가 이미 존재함',
    type: DiaryErrorResponseDto,
  })
  createDiary(
    @CurrentUser() user: AuthUser,
    @Body() request: PostDiariesDto,
  ): Promise<CreateDiaryResponseDto> {
    return this.diariesService.createDiary(user.id, request);
  }

  @Patch(':diaryId')
  @ApiOperation({
    summary: '매매 일기 수정',
    description:
      '전달된 필드만 수정한다. null은 nullable 필드의 기존 값을 삭제하며 BUY/SELL 전용 필드는 해당 유형에서만 사용할 수 있다.',
  })
  @ApiParam({
    name: 'diaryId',
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiBody({ type: UpdateDiaryDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: { $ref: getSchemaPath(UpdateDiaryResponseDto) },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'INVALID_DIARY_ID, EMPTY_UPDATE_REQUEST, INVALID_DIARY_UPDATE 또는 INVALID_FIELD_VALUE',
  })
  @ApiNotFoundResponse({ description: 'DIARY_NOT_FOUND' })
  updateDiary(
    @CurrentUser() user: AuthUser,
    @Param('diaryId', ParseDiaryIdPipe) diaryId: number,
    @UpdateDiaryBody(UpdateDiaryValidationPipe) request: UpdateDiaryDto,
  ): Promise<UpdateDiaryResponseDto> {
    return this.diariesService.updateDiary(user.id, diaryId, request);
  }

  @Get()
  @ApiOperation({
    summary: '매매 일기 목록 조회',
    description:
      '날짜 또는 기간과 종목 코드 조건으로 인증된 사용자의 일기를 페이지 단위로 조회한다. dates와 기간 조건은 동시에 사용할 수 없다.',
  })
  @ApiOkResponse({
    description: '매매 일기 목록 조회 성공',
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: { $ref: getSchemaPath(GetDiariesResponseDto) },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      '요청 검증 실패, INVALID_QUERY_PARAMETER 또는 INVALID_DATE_RANGE',
    type: DiaryErrorResponseDto,
  })
  getDiaries(
    @CurrentUser() user: AuthUser,
    @Query() query: GetDiariesQueryDto,
  ): Promise<GetDiariesResponseDto> {
    return this.diariesService.getDiaries(user.id, query);
  }

  @Get('prefill')
  getDiaryPrefill(
    @CurrentUser() user: AuthUser,
    @Query('orderId', ParseOrderIdPipe) orderId: number,
  ): Promise<DiaryPrefillResponseDto> {
    return this.diariesService.getDiaryPrefill(user.id, orderId);
  }

  @Get(':diaryId')
  getDiaryDetail(
    @CurrentUser() user: AuthUser,
    @Param('diaryId', ParseDiaryIdPipe) diaryId: number,
  ): Promise<DiaryDetailResponseDto> {
    return this.diariesService.getDiaryDetail(user.id, diaryId);
  }
}
