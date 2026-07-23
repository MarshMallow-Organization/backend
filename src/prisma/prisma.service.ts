import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'src/generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(configService: ConfigService) {
    const host = configService.get<string>('database.host');
    const port = configService.get<number>('database.port');
    const username = configService.get<string>('database.username');
    const password = configService.get<string>('database.password');
    const database = configService.get<string>('database.database');

    const adapter = new PrismaMariaDb({
      host,
      port,
      user: username,
      password,
      database,
      allowPublicKeyRetrieval: true,
    });

    super({ adapter });
  }
}
