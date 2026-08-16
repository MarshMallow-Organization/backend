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
import { DiariesService } from '../services/diaries.service';
import { DiaryDetailResponseDto } from '../dto/response/diary-detail-response.dto';
import { ParseDiaryIdPipe } from '../pipes/parse-diary-id.pipe';

@ApiTags('Diaries')
@ApiExtraModels(UpdateDiaryResponseDto)
@Controller('diaries')
@UseGuards(StubAuthGuard)
export class DiariesController {
  constructor(private readonly diariesService: DiariesService) {}

  @Post()
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
  getDiaries(
    @CurrentUser() user: AuthUser,
    @Query() query: GetDiariesQueryDto,
  ): Promise<GetDiariesResponseDto> {
    return this.diariesService.getDiaries(user.id, query);
  }

  @Get(':diaryId')
  getDiaryDetail(
    @CurrentUser() user: AuthUser,
    @Param('diaryId', ParseDiaryIdPipe) diaryId: number,
  ): Promise<DiaryDetailResponseDto> {
    return this.diariesService.getDiaryDetail(user.id, diaryId);
  }
}
