import { Module } from '@nestjs/common';
import { BloqueioService } from './bloqueio.service';
import { BloqueioController } from './bloqueio.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BloqueioController],
  providers: [BloqueioService],
})
export class BloqueioModule {}
