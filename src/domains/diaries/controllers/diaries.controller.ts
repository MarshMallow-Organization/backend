import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { GetDiariesQueryDto } from '../dto/request/get-diaries-query.dto';
import { PostDiariesDto } from '../dto/request/post-diaries.dto';
import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { GetDiariesResponseDto } from '../dto/response/get-diaries-response.dto';
import { DiariesService } from '../services/diaries.service';

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
}
