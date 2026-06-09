import { Module } from '@nestjs/common';
import { LembreteService } from './lembrete.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsappModule],
  providers: [LembreteService]
})
export class LembreteModule {}
