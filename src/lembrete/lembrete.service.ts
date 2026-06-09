import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class LembreteService {
  private readonly logger = new Logger(LembreteService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService,
  ) {}

  // ⏰ Roda todos os dias às 08:00 da manhã
  @Cron(CronExpression.EVERY_DAY_AT_8AM) 
  async enviarLembretesParaAmanha() {
    this.logger.log('Iniciando rotina de lembretes das 08:00...');

    // 1. Calcula a data de amanhã
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setUTCHours(0, 0, 0, 0);

    const fimAmanha = new Date(amanha);
    fimAmanha.setUTCHours(23, 59, 59, 999);

    // 2. Procura agendamentos (Ignora os CANCELADOS ou CONCLUIDOS)
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        data_inicio: { gte: amanha, lte: fimAmanha },
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
      },
      include: {
        paciente: true,
        servico: true,
      },
    });

    if (agendamentos.length === 0) {
      this.logger.log('Nenhum paciente agendado para amanhã. Rotina finalizada.');
      return;
    }

    // 3. Dispara lembretes reais via WhatsApp
    let enviados = 0;
    for (const agendamento of agendamentos) {
      // Pega o horário no formato HH:MM
      const hora = agendamento.data_inicio.toISOString().substring(11, 16); 
      
      try {
        await this.whatsappService.sendMessage(
          agendamento.paciente.telefone,
          `🔔 *BioSchedule - Lembrete*\n\n` +
          `Olá, ${agendamento.paciente.nome}! ` +
          `Lembramos que você tem um horário de *${agendamento.servico.nome}* ` +
          `amanhã às *${hora}*.\n\n` +
          `Te esperamos! 💙`
        );
        enviados++;
      } catch (err) {
        this.logger.error(`Falha ao enviar lembrete para ${agendamento.paciente.nome}:`, err);
      }
    }

    this.logger.log(`✅ Sucesso! ${enviados}/${agendamentos.length} lembretes disparados.`);
  }
}