import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { GetDiariesQueryDto } from '../dto/request/get-diaries-query.dto';
import { PostDiariesDto } from '../dto/request/post-diaries.dto';
import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { GetDiariesResponseDto } from '../dto/response/get-diaries-response.dto';
import { DiariesService } from '../services/diaries.service';
import { DiaryDetailResponseDto } from '../dto/response/diary-detail-response.dto';
import { ParseDiaryIdPipe } from '../pipes/parse-diary-id.pipe';
import { DiaryPrefillResponseDto } from '../dto/response/diary-prefill-response.dto';
import { ParseOrderIdPipe } from '../pipes/parse-order-id.pipe';

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

  @Get()
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
