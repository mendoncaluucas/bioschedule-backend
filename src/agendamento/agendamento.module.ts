import { Module } from '@nestjs/common';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoController } from './agendamento.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from '../email/mail.service'; // ✨ 1. Importando o serviço de e-mail
import { WhatsappModule } from '../whatsapp/whatsapp.module'; // ✨ 2. Importando o módulo do WhatsApp

@Module({
  imports: [PrismaModule, WhatsappModule], // WhatsApp disponível via import do módulo
  controllers: [AgendamentoController],
  providers: [
    AgendamentoService,
    MailService // ✨ MailService como provider direto (não tem módulo próprio)
  ],
})
export class AgendamentoModule {}