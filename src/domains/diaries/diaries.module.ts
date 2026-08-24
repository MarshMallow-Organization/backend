import { Module } from '@nestjs/common';
import { DiariesController } from './controllers/diaries.controller';
import { DiariesRepository } from './repositories/diaries.repository';
import { DiariesService } from './services/diaries.service';
import { PrismaDiariesRepository } from './repositories/prisma-diaries.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiariesController],
  providers: [
    DiariesService,
    {
      provide: DiariesRepository,
      useClass: PrismaDiariesRepository,
    },
  ],
})
export class DiariesModule {}
