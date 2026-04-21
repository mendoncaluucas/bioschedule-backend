import { Module } from '@nestjs/common';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoController } from './agendamento.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from '../email/mail.service'; // ✨ 1. Importando o serviço de e-mail

@Module({
  imports: [PrismaModule], // Não esqueça disso!
  controllers: [AgendamentoController],
  providers: [
    AgendamentoService,
    MailService // ✨ 2. Avisando ao NestJS que o MailService está disponível para uso!
  ],
})
export class AgendamentoModule {}