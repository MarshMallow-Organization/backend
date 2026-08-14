import { Module, NotImplementedException } from '@nestjs/common';
import { DiariesController } from './controllers/diaries.controller';
import { DiariesRepository } from './services/diaries.repository';
import { DiariesService } from './services/diaries.service';

@Module({
  controllers: [DiariesController],
  providers: [
    DiariesService,
    {
      provide: DiariesRepository,
      useFactory: (): DiariesRepository =>
        new Proxy({} as DiariesRepository, {
          get: () => (): never => {
            throw new NotImplementedException(
              'DiariesRepository 구현이 아직 등록되지 않았습니다.',
            );
          },
        }),
    },
  ],
})
export class DiariesModule {}
