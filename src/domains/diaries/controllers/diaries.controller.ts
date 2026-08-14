import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { GetDiariesQueryDto } from '../dto/request/get-diaries-query.dto';
import { PostDiariesDto } from '../dto/request/post-diaries.dto';
import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { GetDiariesResponseDto } from '../dto/response/get-diaries-response.dto';
import { DiariesService } from '../services/diaries.service';

@Controller('diaries')
export class DiariesController {
  constructor(private readonly diariesService: DiariesService) {}

  @Post()
  createDiary(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() request: PostDiariesDto,
  ): Promise<CreateDiaryResponseDto> {
    const userId = Number(userIdHeader);

    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('x-user-id 헤더가 올바르지 않습니다.');
    }

    return this.diariesService.createDiary(userId, request);
  }

  @Get()
  getDiaries(
    @Headers('x-user-id') userIdHeader: string | undefined, //임시 조회를 위한 x-user-id 나중에는 authorization을 받음
    @Query() query: GetDiariesQueryDto,
  ): Promise<GetDiariesResponseDto> {
    const userId = Number(userIdHeader);

    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('x-user-id 헤더가 올바르지 않습니다.');
    }

    return this.diariesService.getDiaries(userId, query);
  }
}
