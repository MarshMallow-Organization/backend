import { Module, NotImplementedException } from '@nestjs/common';
import { DiariesController } from './controllers/diaries.controller';
import { DiariesRepository } from './repositories/diaries.repository';
import { DiariesService } from './services/diaries.service';
import { CreateDiaryResponseDto } from './dto/response/create-diary-response.dto';
import { DiaryOrderSnapshot } from './models/diary-order-snapshot.model';
import { DiaryPageResult } from './models/diary-page.model';
import { DiaryDetailResponseDto } from './dto/response/diary-detail-response.dto';

class DiariesRepositoryStub extends DiariesRepository {
  private notImplemented(): never {
    throw new NotImplementedException(
      'DiariesRepository 구현이 아직 등록되지 않았습니다.',
    );
  }

  findPage(): Promise<DiaryPageResult> {
    return this.notImplemented();
  }

  findOrderById(): Promise<DiaryOrderSnapshot | null> {
    return this.notImplemented();
  }

  existsActiveDiary(): Promise<boolean> {
    return this.notImplemented();
  }

  createDiary(): Promise<CreateDiaryResponseDto> {
    return this.notImplemented();
  }

  findDetailById(): Promise<DiaryDetailResponseDto | null> {
    return this.notImplemented();
  }
}

@Module({
  controllers: [DiariesController],
  providers: [
    DiariesService,
    {
      provide: DiariesRepository, //nestjs가 의존성을 찾을 때 사용하는 토큰 = DI 토큰
      useClass: DiariesRepositoryStub,
    },
  ],
})
export class DiariesModule {}
